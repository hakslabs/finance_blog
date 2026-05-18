"""Second-pass CUSIP-* placeholder backfill via OpenFIGI name search.

After `backfill_cusip_placeholders.py` resolves CUSIPs that OpenFIGI's
ID lookup can match, ~50% of placeholders may remain: foreign issuers
(CUSIP starting with G/H/L/N/Y), bond CUSIPs, delisted/renamed
companies. Many of those still have a clean US listing today under the
same issuer name — Chubb (CB), Spotify (SPOT), Rivian (RIVN), etc.

This script searches OpenFIGI by *name* for the remaining placeholders
and accepts only matches that share an issuer-name prefix with the
placeholder, to avoid pulling in unrelated tickers. The downstream
rewrite (find/create real instrument, alias, rewrite filing_holdings,
drop placeholder) is identical to the first pass.

Run:
    cd <repo>
    PYTHONPATH=api python scripts/backfill_cusip_by_name.py
"""

from __future__ import annotations

import asyncio
import os
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx


ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = ROOT / ".env"
if ENV_FILE.exists():
    for raw in ENV_FILE.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        value = value.strip()
        if value and not value.startswith(("'", '"')):
            hash_idx = value.find(" #")
            if hash_idx >= 0:
                value = value[:hash_idx].rstrip()
        value = value.strip('"').strip("'")
        os.environ.setdefault(key.strip(), value)


SBURL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SRK = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
OPENFIGI_KEY = os.environ.get("OPENFIGI_API_KEY") or None
OPENFIGI_SEARCH = "https://api.openfigi.com/v3/search"

if not (SBURL and SRK):
    print("missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
    sys.exit(2)


HEADERS = {"apikey": SRK, "Authorization": f"Bearer {SRK}"}
JSON_HEADERS = {**HEADERS, "Content-Type": "application/json"}


US_EXCH = {
    "UN": "NYSE", "UQ": "NASDAQ", "UR": "NASDAQ", "UW": "NASDAQ",
    "UA": "NYSE", "UP": "NYSEARCA", "PK": "OTC", "UV": "OTC",
    # Composite — when we hit this via name search there's usually no
    # sister venue record in the same page, so we default to NASDAQ.
    "US": "NASDAQ",
}


# Tokens that appear in 13F-reported names but not in OpenFIGI search
# matches: corporate-form suffixes ("INC", "CORP"), country tags
# ("SWITZ", "CAYMAN"), share-class hints ("CL A").
_NOISE_TOKENS = {
    "INC", "INC.", "CORP", "CORPORATION", "CO", "CO.", "COMPANY",
    "LTD", "LIMITED", "PLC", "NV", "SA", "S.A.", "AG", "GROUP", "GROUPE",
    "HOLDINGS", "HOLDING", "HLDGS", "HLDG", "INDUSTRIES",
    "THE", "NEW", "OLD",
    "COM", "COMMON", "STOCK", "STK", "SHS", "SHARES",
    "CL", "CLASS", "A", "B", "C",
    "SWITZ", "SWITZERLAND", "BERMUDA", "CAYMAN", "IRELAND", "JERSEY",
    "BRITISH", "VIRGIN", "ISLANDS",
}


def _normalize_name(raw: str) -> str:
    s = re.sub(r"[^\w\s]", " ", raw.upper())
    tokens = [t for t in s.split() if t and t not in _NOISE_TOKENS]
    return " ".join(tokens).strip()


def _name_matches(placeholder_norm: str, candidate_name: str) -> bool:
    cand = _normalize_name(candidate_name)
    if not placeholder_norm or not cand:
        return False
    # Require the first token of the placeholder name to appear in the
    # candidate, and at least 60% of placeholder tokens to overlap.
    ph_tokens = placeholder_norm.split()
    cand_tokens = set(cand.split())
    if ph_tokens[0] not in cand_tokens:
        return False
    overlap = sum(1 for t in ph_tokens if t in cand_tokens)
    return overlap / max(len(ph_tokens), 1) >= 0.6


async def _sb_get(client: httpx.AsyncClient, path: str, params: Dict[str, str]) -> List[Dict[str, Any]]:
    r = await client.get(f"{SBURL}/rest/v1/{path}", params=params, headers=HEADERS)
    r.raise_for_status()
    return r.json()


async def _sb_post(client: httpx.AsyncClient, path: str, body: Any, *, prefer: str = "return=representation", params: Optional[Dict[str, str]] = None) -> Any:
    h = {**JSON_HEADERS, "Prefer": prefer}
    r = await client.post(f"{SBURL}/rest/v1/{path}", json=body, headers=h, params=params or {})
    if r.status_code >= 400:
        raise RuntimeError(f"POST {path} {r.status_code} {r.text[:200]}")
    return r.json() if "representation" in prefer else None


async def _sb_patch(client: httpx.AsyncClient, path: str, body: Dict[str, Any], params: Dict[str, str]) -> None:
    h = {**JSON_HEADERS, "Prefer": "return=minimal"}
    r = await client.patch(f"{SBURL}/rest/v1/{path}", json=body, headers=h, params=params)
    if r.status_code >= 400 and r.status_code != 404:
        raise RuntimeError(f"PATCH {path} {r.status_code} {r.text[:200]}")


async def _sb_delete(client: httpx.AsyncClient, path: str, params: Dict[str, str]) -> None:
    r = await client.delete(f"{SBURL}/rest/v1/{path}", params=params, headers=HEADERS)
    if r.status_code >= 400:
        raise RuntimeError(f"DELETE {path} {r.status_code} {r.text[:200]}")


async def openfigi_search(client: httpx.AsyncClient, query: str) -> List[Dict[str, Any]]:
    headers = {"Content-Type": "application/json"}
    if OPENFIGI_KEY:
        headers["X-OPENFIGI-APIKEY"] = OPENFIGI_KEY
    # Scope to US-composite listings so option/futures rows don't crowd
    # out the actual equity match.
    body = {"query": query, "exchCode": "US"}
    for attempt in range(3):
        r = await client.post(OPENFIGI_SEARCH, json=body, headers=headers, timeout=30.0)
        if r.status_code == 429:
            await asyncio.sleep(15)
            continue
        if r.status_code >= 400:
            return []
        return (r.json() or {}).get("data") or []
    return []


def _pick_us_equity(data: List[Dict[str, Any]], placeholder_norm: str) -> Optional[Dict[str, Any]]:
    PREFERRED_TYPES = {"Common Stock", "Depositary Receipt", "ADR", "ETP",
                       "Open-End Fund", "Closed-End Fund", "REIT"}
    # First pass: US exchange + preferred type + name matches
    for d in data:
        if (d.get("exchCode") in US_EXCH
                and d.get("securityType2") in PREFERRED_TYPES
                and _name_matches(placeholder_norm, d.get("name") or "")):
            return d
    # Second pass: US exchange + name matches (any equity type)
    for d in data:
        if d.get("exchCode") in US_EXCH and _name_matches(placeholder_norm, d.get("name") or ""):
            return d
    return None


async def get_or_create_instrument(client: httpx.AsyncClient, ticker: str, exchange: str, name: str) -> Optional[str]:
    rows = await _sb_get(
        client, "instruments",
        {"symbol": f"eq.{ticker}", "country_code": "eq.US", "select": "id", "limit": "1"},
    )
    if rows:
        return rows[0]["id"]
    body = [{
        "symbol": ticker, "name": name[:120], "exchange": exchange,
        "asset_type": "stock", "country_code": "US", "currency": "USD",
    }]
    rep = await _sb_post(
        client, "instruments", body,
        params={"on_conflict": "symbol,exchange"},
        prefer="resolution=merge-duplicates,return=representation",
    )
    if rep:
        return rep[0]["id"]
    again = await _sb_get(
        client, "instruments",
        {"symbol": f"eq.{ticker}", "exchange": f"eq.{exchange}", "select": "id", "limit": "1"},
    )
    return again[0]["id"] if again else None


async def rewrite_holdings(client: httpx.AsyncClient, placeholder_id: str, real_id: str) -> Dict[str, int]:
    rows = await _sb_get(
        client, "filing_holdings",
        {"instrument_id": f"eq.{placeholder_id}", "select": "filing_id,shares,market_value"},
    )
    moved = 0
    merged = 0
    for row in rows:
        existing = await _sb_get(
            client, "filing_holdings",
            {"filing_id": f"eq.{row['filing_id']}", "instrument_id": f"eq.{real_id}",
             "select": "shares,market_value", "limit": "1"},
        )
        if existing:
            new_shares = float(existing[0]["shares"] or 0) + float(row["shares"] or 0)
            new_mv = float(existing[0].get("market_value") or 0) + float(row.get("market_value") or 0)
            await _sb_patch(
                client, "filing_holdings",
                {"shares": new_shares, "market_value": new_mv},
                {"filing_id": f"eq.{row['filing_id']}", "instrument_id": f"eq.{real_id}"},
            )
            await _sb_delete(
                client, "filing_holdings",
                {"filing_id": f"eq.{row['filing_id']}", "instrument_id": f"eq.{placeholder_id}"},
            )
            merged += 1
        else:
            await _sb_patch(
                client, "filing_holdings",
                {"instrument_id": real_id},
                {"filing_id": f"eq.{row['filing_id']}", "instrument_id": f"eq.{placeholder_id}"},
            )
            moved += 1
    return {"moved": moved, "merged": merged}


async def main() -> None:
    sleep_s = 0.3 if OPENFIGI_KEY else 2.5  # search endpoint shares the unauth pool (60/min)
    async with httpx.AsyncClient(timeout=30.0) as client:
        placeholders = await _sb_get(
            client, "instruments",
            {"symbol": "like.CUSIP-*", "select": "id,symbol,name"},
        )
        print(f"loaded {len(placeholders)} placeholders")

        retired = 0
        moved_total = 0
        merged_total = 0
        unmatched: List[str] = []

        for i, ph in enumerate(placeholders):
            raw_name = ph.get("name") or ""
            norm = _normalize_name(raw_name)
            if not norm:
                unmatched.append(f"{ph['symbol']} (empty name)")
                continue

            # Build the search query — first token usually carries the
            # issuer identity (CHUBB, RIVIAN, etc.). Sometimes the first
            # token is the prefix ("THE", "NEW") which _normalize_name
            # already strips.
            query = norm.split()[0]
            data = await openfigi_search(client, query)
            pick = _pick_us_equity(data, norm)
            await asyncio.sleep(sleep_s)

            if not pick:
                unmatched.append(f"{ph['symbol']} | {raw_name}")
            else:
                ticker = (pick.get("ticker") or "").strip()
                exch = US_EXCH.get(pick.get("exchCode") or "")
                if not ticker or not exch:
                    unmatched.append(f"{ph['symbol']} | {raw_name} (bad pick)")
                else:
                    cusip = ph["symbol"][len("CUSIP-"):]
                    real_id = await get_or_create_instrument(client, ticker, exch, pick.get("name") or raw_name)
                    if real_id:
                        await _sb_delete(
                            client, "instrument_aliases",
                            {"alias_kind": "eq.cusip", "alias_value": f"eq.{cusip}"},
                        )
                        try:
                            await _sb_post(
                                client, "instrument_aliases",
                                [{"instrument_id": real_id, "alias_kind": "cusip",
                                  "alias_value": cusip, "source": "openfigi_search"}],
                                prefer="return=minimal",
                            )
                        except RuntimeError as exc:
                            print(f"  alias {cusip}: {exc}", file=sys.stderr)
                        res = await rewrite_holdings(client, ph["id"], real_id)
                        moved_total += res["moved"]
                        merged_total += res["merged"]
                        try:
                            await _sb_delete(client, "instruments", {"id": f"eq.{ph['id']}"})
                            retired += 1
                            print(f"  [{retired:3d}] {ph['symbol']:18s} {raw_name[:35]:35s} -> {ticker:6s} ({exch})")
                        except RuntimeError as exc:
                            print(f"  drop {ph['symbol']}: {exc}", file=sys.stderr)

            if (i + 1) % 25 == 0:
                print(f"… progress {i + 1}/{len(placeholders)}  retired={retired}  unmatched={len(unmatched)}")

        print()
        print(f"retired: {retired}")
        print(f"  holdings moved:  {moved_total}")
        print(f"  holdings merged: {merged_total}")
        print(f"unmatched: {len(unmatched)}")
        if unmatched:
            print("first 20 unmatched:")
            for line in unmatched[:20]:
                print(" ", line)


if __name__ == "__main__":
    asyncio.run(main())
