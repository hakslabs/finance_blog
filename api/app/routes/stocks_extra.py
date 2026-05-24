"""Extra per-symbol read endpoints used by the stock-detail page tabs.

Each endpoint is a thin live-fetch wrapper over a free third-party API.
We do not cache into Supabase here — ingestion lives in a later PR. The
goal is just to put real values on screen now using already-connected
keys (Finnhub, Alpha Vantage, SEC EDGAR).

If the relevant API key is missing or the upstream fails, endpoints
return empty arrays / nulls instead of 500ing so the page stays usable.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.settings import Settings, get_settings
from app.sources import dart, finnhub, sec

import httpx


router = APIRouter(prefix="/stocks", tags=["stocks"])


class Bar(BaseModel):
    date: str   # ISO date (YYYY-MM-DD)
    open: float
    high: float
    low: float
    close: float
    volume: Optional[float] = None


class BarsResponse(BaseModel):
    symbol: str
    items: List[Bar]
    requested_days: int = 0
    returned_count: int = 0
    from_date: Optional[str] = None
    to_date: Optional[str] = None
    instrument_count: int = 0
    raw_count: int = 0
    duplicate_count: int = 0


class BarsCompareSeries(BaseModel):
    symbol: str
    requested_days: int = 0
    returned_count: int = 0
    from_date: Optional[str] = None
    to_date: Optional[str] = None


class BarsCompareResponse(BaseModel):
    symbols: List[str]
    requested_days: int = 0
    compare_from_date: Optional[str] = None
    compare_to_date: Optional[str] = None
    compare_baseline_date: Optional[str] = None
    compare_row_count: int = 0
    rows: List[Dict[str, Any]]
    returns: Dict[str, float]
    series: List[BarsCompareSeries]


def _parse_bar_date(value: Any) -> Optional[date]:
    try:
        return date.fromisoformat(str(value)[:10])
    except (TypeError, ValueError):
        return None


def _within_calendar_window(rows: List[Dict[str, Any]], days: int) -> List[Dict[str, Any]]:
    parsed_dates = [_parse_bar_date(row.get("t")) for row in rows]
    latest = max((d for d in parsed_dates if d is not None), default=None)
    if latest is None:
        return rows
    cutoff = latest - timedelta(days=max(0, days - 1))
    return [
        row
        for row, parsed in zip(rows, parsed_dates)
        if parsed is not None and parsed >= cutoff
    ]


def _bars_response(
    symbol: str,
    items: List[Bar],
    days: int,
    *,
    instrument_count: int = 0,
    raw_count: int = 0,
    duplicate_count: int = 0,
) -> BarsResponse:
    return BarsResponse(
        symbol=symbol,
        items=items,
        requested_days=days,
        returned_count=len(items),
        from_date=items[0].date if items else None,
        to_date=items[-1].date if items else None,
        instrument_count=instrument_count,
        raw_count=raw_count,
        duplicate_count=duplicate_count,
    )


def _label_for_compare_date(date_value: str, days: int) -> str:
    if days >= 365:
        return f"{date_value[2:4]}/{date_value[5:7]}"
    return f"{date_value[5:7]}/{date_value[8:10]}"


def _bars_compare_response(
    responses: List[BarsResponse],
    days: int,
) -> BarsCompareResponse:
    symbols = [response.symbol for response in responses]
    date_set: set[str] = set()
    prices_by_symbol: Dict[str, Dict[str, float]] = {}

    for response in responses:
        prices: Dict[str, float] = {}
        for bar in response.items:
            prices[bar.date] = bar.close
            date_set.add(bar.date)
        prices_by_symbol[response.symbol] = prices

    valid_symbols = [
        symbol for symbol in symbols if len(prices_by_symbol.get(symbol, {})) > 0
    ]
    base_by_symbol: Dict[str, float] = {}
    last_by_symbol: Dict[str, float] = {}
    rows: List[Dict[str, Any]] = []
    returns: Dict[str, float] = {}
    series_latest_dates = [
        max(prices_by_symbol[symbol])
        for symbol in valid_symbols
        if prices_by_symbol.get(symbol)
    ]
    common_latest_date = min(series_latest_dates) if series_latest_dates else None
    sorted_dates = [
        date_value
        for date_value in sorted(date_set)
        if common_latest_date is None or date_value <= common_latest_date
    ]
    latest_date = sorted_dates[-1] if sorted_dates else None

    for date_value in sorted_dates:
        for symbol in valid_symbols:
            close = prices_by_symbol.get(symbol, {}).get(date_value)
            if close is not None:
                last_by_symbol[symbol] = close

        if valid_symbols and len(base_by_symbol) < len(valid_symbols):
            if not all(symbol in last_by_symbol for symbol in valid_symbols):
                continue
            for symbol in valid_symbols:
                base_by_symbol[symbol] = last_by_symbol[symbol]

        row: Dict[str, Any] = {
            "date": date_value,
            "label": _label_for_compare_date(date_value, days),
        }
        for symbol in symbols:
            base = base_by_symbol.get(symbol)
            latest = last_by_symbol.get(symbol)
            value = (
                ((latest - base) / base) * 100
                if base is not None and latest is not None and base != 0
                else None
            )
            row[symbol] = value
            if date_value == latest_date and value is not None:
                returns[symbol] = value
        rows.append(row)

    return BarsCompareResponse(
        symbols=symbols,
        requested_days=days,
        compare_from_date=rows[0]["date"] if rows else None,
        compare_to_date=rows[-1]["date"] if rows else None,
        compare_baseline_date=rows[0]["date"] if rows else None,
        compare_row_count=len(rows),
        rows=rows,
        returns=returns,
        series=[
            BarsCompareSeries(
                symbol=response.symbol,
                requested_days=response.requested_days,
                returned_count=response.returned_count,
                from_date=response.from_date,
                to_date=response.to_date,
            )
            for response in responses
        ],
    )


class NewsItem(BaseModel):
    id: str
    headline: str
    summary: Optional[str] = None
    source: Optional[str] = None
    url: Optional[str] = None
    category: Optional[str] = None
    datetime: Optional[str] = None
    image: Optional[str] = None


class NewsResponse(BaseModel):
    symbol: str
    items: List[NewsItem]


class CompanyProfile(BaseModel):
    name: Optional[str] = None
    country: Optional[str] = None
    currency: Optional[str] = None
    exchange: Optional[str] = None
    industry: Optional[str] = None
    ipo: Optional[str] = None
    market_cap: Optional[float] = None
    share_outstanding: Optional[float] = None
    logo: Optional[str] = None
    weburl: Optional[str] = None
    phone: Optional[str] = None


class ProfileResponse(BaseModel):
    symbol: str
    profile: Optional[CompanyProfile] = None
    metrics: Dict[str, Any] = {}


class RecommendationBucket(BaseModel):
    period: Optional[str] = None
    strong_buy: int = 0
    buy: int = 0
    hold: int = 0
    sell: int = 0
    strong_sell: int = 0


class PriceTarget(BaseModel):
    target_high: Optional[float] = None
    target_low: Optional[float] = None
    target_mean: Optional[float] = None
    target_median: Optional[float] = None
    last_updated: Optional[str] = None
    number_of_analysts: Optional[int] = None


class ConsensusResponse(BaseModel):
    symbol: str
    recommendations: List[RecommendationBucket]
    price_target: Optional[PriceTarget] = None


class FilingItem(BaseModel):
    accession: str
    form: str
    filed_at: Optional[str] = None
    description: Optional[str] = None
    url: Optional[str] = None


class FilingsResponse(BaseModel):
    symbol: str
    cik: Optional[str] = None
    items: List[FilingItem]


class FinancialPeriod(BaseModel):
    year: Optional[int] = None
    quarter: Optional[int] = None
    period: Optional[str] = None
    form: Optional[str] = None
    income_statement: List[Dict[str, Any]] = []
    balance_sheet: List[Dict[str, Any]] = []
    cash_flow: List[Dict[str, Any]] = []


class FinancialsResponse(BaseModel):
    symbol: str
    freq: str
    periods: List[FinancialPeriod]


async def _news_from_db(symbol: str, settings: Settings) -> List[NewsItem]:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return []
    headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Accept": "application/json",
    }
    base = settings.supabase_url.rstrip("/")
    async with httpx.AsyncClient(timeout=8.0, headers=headers) as client:
        inst_resp = await client.get(
            f"{base}/rest/v1/instruments",
            params={"symbol": f"eq.{symbol}", "select": "id", "limit": "1"},
        )
        if inst_resp.status_code >= 400 or not inst_resp.json():
            return []
        instrument_id = inst_resp.json()[0]["id"]
        news_resp = await client.get(
            f"{base}/rest/v1/news_instruments",
            params={
                "instrument_id": f"eq.{instrument_id}",
                "select": "news_items(id,source,external_id,title,summary,url,published_at)",
                "order": "news_items(published_at).desc",
                "limit": "30",
            },
        )
        if news_resp.status_code >= 400:
            return []
        rows = news_resp.json()
    items: List[NewsItem] = []
    for r in rows:
        n = r.get("news_items") or {}
        if not n.get("title"):
            continue
        items.append(
            NewsItem(
                id=str(n.get("id") or n.get("external_id") or ""),
                headline=n["title"],
                summary=n.get("summary"),
                source=n.get("source"),
                url=n.get("url"),
                category=None,
                datetime=n.get("published_at"),
                image=None,
            )
        )
    return items


async def _stock_bars_from_db(
    symbol: str,
    days: int,
    settings: Settings,
) -> BarsResponse:
    symbol = symbol.upper()
    if not (settings.supabase_url and settings.supabase_service_role_key):
        return _bars_response(symbol, [], days)
    base = settings.supabase_url.rstrip("/")
    headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Accept": "application/json",
    }
    # KR symbols are stored in instruments with the legacy ".KS" suffix
    # from KRX while the URL/universe use bare 6-digit codes. Try the
    # request value first, then a few common aliases so the route works
    # for /stocks/000660 AND /stocks/000660.KS.
    candidates = [symbol]
    if symbol.isdigit() and len(symbol) == 6:
        candidates += [f"{symbol}.KS", f"{symbol}.KQ"]
    elif symbol.endswith((".KS", ".KQ")):
        candidates.insert(0, symbol[:-3])
    async with httpx.AsyncClient(timeout=8.0, headers=headers) as client:
        # Collect ALL candidate instrument_ids — legacy data sometimes has
        # the same `symbol` duplicated under different `exchange` labels
        # (e.g. 005930.KS exists once as KRX and once as KOSPI). The
        # 5-year backfill landed on one of them; we don't know which
        # ahead of time, so query bars across the full set and let the
        # one with data win.
        inst_ids: List[str] = []
        inst_order: Dict[str, int] = {}
        for cand_idx, cand in enumerate(candidates):
            inst_resp = await client.get(
                f"{base}/rest/v1/instruments",
                params={
                    "symbol": f"eq.{cand}",
                    "select": "id,exchange",
                    "is_active": "eq.true",
                    "order": "exchange.asc",
                    "limit": "5",
                },
            )
            if inst_resp.status_code < 400 and inst_resp.json():
                for row_idx, row in enumerate(inst_resp.json()):
                    iid = row["id"]
                    if iid in inst_order:
                        continue
                    inst_order[iid] = cand_idx * 10 + row_idx
                    inst_ids.append(iid)
        if not inst_ids:
            return _bars_response(symbol, [], days)
        # Fetch per-id with paginated offsets. PostgREST hard-caps each
        # response at 1000 rows, so 5-year requests need multiple pages.
        PAGE = 1000
        all_rows: List[Dict[str, Any]] = []
        for iid in inst_ids:
            offset = 0
            collected = 0
            source_rows: List[Dict[str, Any]] = []
            while collected < days:
                page_size = min(PAGE, days - collected)
                r = await client.get(
                    f"{base}/rest/v1/price_bars_daily",
                    params={
                        "instrument_id": f"eq.{iid}",
                        "select": "t,o,h,l,c,v",
                        "order": "t.desc",
                        "limit": str(page_size),
                        "offset": str(offset),
                    },
                )
                if r.status_code >= 400:
                    break
                rows = r.json()
                if not rows:
                    break
                source_rows.extend(rows)
                collected += len(rows)
                offset += len(rows)
                if len(rows) < page_size:
                    break  # exhausted this id's history
            latest_t = str(source_rows[0].get("t", "")) if source_rows else ""
            for row in source_rows:
                row["_source_latest_t"] = latest_t
                row["_source_order"] = inst_order.get(iid, 9999)
            all_rows.extend(source_rows)
        # The query param is named days, so trim by actual calendar dates
        # after over-fetching rows. Otherwise 90 trading rows can render as
        # four months, and stale legacy instrument rows can leak into short
        # windows.
        all_rows = _within_calendar_window(all_rows, days)
        # Sort descending by bar date, then by source freshness. This makes
        # duplicate symbol rows deterministic when legacy/current instruments
        # overlap: the instrument with the freshest overall series wins.
        all_rows.sort(
            key=lambda r: (
                str(r.get("t", "")),
                str(r.get("_source_latest_t", "")),
                -int(r.get("_source_order", 9999)),
            ),
            reverse=True,
        )
    # Dedup by date (keep first occurrence from the desc-ordered list)
    # then flip to ascending and trim to `days`.
    seen: set[str] = set()
    deduped: List[Dict[str, Any]] = []
    duplicate_count = 0
    for r in all_rows:
        d = str(r["t"])[:10]
        if d in seen:
            duplicate_count += 1
            continue
        seen.add(d)
        deduped.append(r)
        if len(deduped) >= days:
            break
    rows = list(reversed(deduped))
    items = [
        Bar(
            date=str(r["t"])[:10],
            open=float(r["o"]),
            high=float(r["h"]),
            low=float(r["l"]),
            close=float(r["c"]),
            volume=float(r["v"]) if r.get("v") is not None else None,
        )
        for r in rows
    ]
    return _bars_response(
        symbol,
        items,
        days,
        instrument_count=len(inst_ids),
        raw_count=len(all_rows),
        duplicate_count=duplicate_count,
    )


@router.get("/bars/compare", response_model=BarsCompareResponse)
async def stock_bars_compare(
    symbols: str = Query(..., min_length=1),
    days: int = Query(365, ge=1, le=1825),
    settings: Settings = Depends(get_settings),
) -> BarsCompareResponse:
    """여러 종목의 DB 일봉을 공통 날짜축 수익률 차트용으로 정렬한다."""
    requested_symbols: List[str] = []
    seen: set[str] = set()
    for raw_symbol in symbols.split(","):
        symbol = raw_symbol.strip().upper()
        if not symbol or symbol in seen:
            continue
        seen.add(symbol)
        requested_symbols.append(symbol)
        if len(requested_symbols) >= 12:
            break

    if not requested_symbols:
        return BarsCompareResponse(
            symbols=[],
            requested_days=days,
            compare_from_date=None,
            compare_to_date=None,
            compare_baseline_date=None,
            compare_row_count=0,
            rows=[],
            returns={},
            series=[],
        )

    responses = [
        await _stock_bars_from_db(symbol, days, settings) for symbol in requested_symbols
    ]
    return _bars_compare_response(responses, days)


@router.get("/{symbol}/bars", response_model=BarsResponse)
async def stock_bars(
    symbol: str,
    days: int = Query(90, ge=1, le=1825),
    settings: Settings = Depends(get_settings),
) -> BarsResponse:
    """일봉 OHLC. price_bars_daily 테이블에서 instrument_id 룩업 후 최신 N일.

    데이터가 없으면 빈 배열을 반환한다. UI는 명시적인 empty state를 그린다.
    """
    return await _stock_bars_from_db(symbol, days, settings)


@router.get("/{symbol}/news", response_model=NewsResponse)
async def stock_news(
    symbol: str,
    days: int = Query(14, ge=1, le=30),
    settings: Settings = Depends(get_settings),
) -> NewsResponse:
    symbol = symbol.upper()
    db_items = await _news_from_db(symbol, settings)
    if db_items:
        return NewsResponse(symbol=symbol, items=db_items)
    if not settings.finnhub_api_key:
        return NewsResponse(symbol=symbol, items=[])
    try:
        raw = await finnhub.fetch_company_news(symbol, settings.finnhub_api_key, days=days)
    except HTTPException:
        return NewsResponse(symbol=symbol, items=[])
    return NewsResponse(symbol=symbol, items=[NewsItem(**r) for r in raw])


@router.get("/{symbol}/profile", response_model=ProfileResponse)
async def stock_profile(
    symbol: str,
    settings: Settings = Depends(get_settings),
) -> ProfileResponse:
    symbol = symbol.upper()
    if not settings.finnhub_api_key:
        return ProfileResponse(symbol=symbol, profile=None, metrics={})
    profile_raw = None
    metrics: Dict[str, Any] = {}
    try:
        profile_raw = await finnhub.fetch_company_profile(symbol, settings.finnhub_api_key)
    except HTTPException:
        profile_raw = None
    try:
        metrics = await finnhub.fetch_basic_financials(symbol, settings.finnhub_api_key)
    except HTTPException:
        metrics = {}
    profile = CompanyProfile(**profile_raw) if profile_raw else None
    return ProfileResponse(symbol=symbol, profile=profile, metrics=metrics)


async def _db_price_target(symbol: str, settings: Settings) -> Optional[Dict[str, Any]]:
    """Read latest target-price snapshot from consensus_snapshots."""
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return None
    headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Accept": "application/json",
    }
    base = settings.supabase_url.rstrip("/")
    async with httpx.AsyncClient(timeout=6.0, headers=headers) as client:
        inst = await client.get(
            f"{base}/rest/v1/instruments",
            params={
                "symbol": f"eq.{symbol}",
                "country_code": "eq.US",
                "select": "id",
                "limit": "1",
            },
        )
        if inst.status_code >= 400 or not inst.json():
            return None
        instrument_id = inst.json()[0]["id"]
        snap = await client.get(
            f"{base}/rest/v1/consensus_snapshots",
            params={
                "instrument_id": f"eq.{instrument_id}",
                "metric": "eq.target_price",
                "order": "asof.desc",
                "select": "mean,n,asof,source",
                "limit": "1",
            },
        )
        if snap.status_code >= 400:
            return None
        rows = snap.json()
        if not rows:
            return None
        row = rows[0]
        return {
            "target_high": None,
            "target_low": None,
            "target_mean": float(row["mean"]) if row.get("mean") is not None else None,
            "target_median": None,
            "last_updated": row.get("asof"),
            "number_of_analysts": row.get("n"),
        }


@router.get("/{symbol}/consensus", response_model=ConsensusResponse)
async def stock_consensus(
    symbol: str,
    settings: Settings = Depends(get_settings),
) -> ConsensusResponse:
    symbol = symbol.upper()
    recommendations: List[Dict[str, Any]] = []
    if settings.finnhub_api_key:
        try:
            recommendations = await finnhub.fetch_recommendation_trends(
                symbol, settings.finnhub_api_key
            )
        except HTTPException:
            recommendations = []
    # Target-price: DB first (populated daily by ingest_av_targets), then
    # Finnhub as a courtesy fallback (returns None on free tier).
    target = await _db_price_target(symbol, settings)
    if not target and settings.finnhub_api_key:
        try:
            target = await finnhub.fetch_price_target(symbol, settings.finnhub_api_key)
        except HTTPException:
            target = None
    return ConsensusResponse(
        symbol=symbol,
        recommendations=[RecommendationBucket(**r) for r in recommendations],
        price_target=PriceTarget(**target) if target else None,
    )


@router.get("/{symbol}/financials", response_model=FinancialsResponse)
async def stock_financials(
    symbol: str,
    freq: str = Query("annual", pattern="^(annual|quarterly)$"),
    settings: Settings = Depends(get_settings),
) -> FinancialsResponse:
    symbol = symbol.upper()
    if not settings.finnhub_api_key:
        return FinancialsResponse(symbol=symbol, freq=freq, periods=[])
    try:
        raw = await finnhub.fetch_financials_reported(
            symbol, settings.finnhub_api_key, freq=freq
        )
    except HTTPException:
        return FinancialsResponse(symbol=symbol, freq=freq, periods=[])
    periods = [
        FinancialPeriod(
            year=r.get("year"),
            quarter=r.get("quarter"),
            period=r.get("period"),
            form=r.get("form"),
            income_statement=r.get("ic") or [],
            balance_sheet=r.get("bs") or [],
            cash_flow=r.get("cf") or [],
        )
        for r in raw
    ]
    return FinancialsResponse(symbol=symbol, freq=freq, periods=periods)


async def _kr_corp_code(symbol: str, settings: Settings) -> Optional[str]:
    """Look up DART corp_code from instruments table for a KR symbol."""
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return None
    headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Accept": "application/json",
    }
    base = settings.supabase_url.rstrip("/")
    async with httpx.AsyncClient(timeout=6.0, headers=headers) as client:
        resp = await client.get(
            f"{base}/rest/v1/instruments",
            params={
                "symbol": f"eq.{symbol}",
                "country_code": "eq.KR",
                "select": "corp_code",
                "limit": "1",
            },
        )
        if resp.status_code >= 400:
            return None
        rows = resp.json()
        if not rows:
            return None
        return rows[0].get("corp_code")


class NextEarning(BaseModel):
    date: Optional[str] = None
    hour: Optional[str] = None
    eps_estimate: Optional[float] = None
    revenue_estimate: Optional[float] = None
    year: Optional[int] = None
    quarter: Optional[int] = None


class NextEarningResponse(BaseModel):
    symbol: str
    next: Optional[NextEarning] = None


@router.get("/{symbol}/next-earning", response_model=NextEarningResponse)
async def stock_next_earning(
    symbol: str,
    settings: Settings = Depends(get_settings),
) -> NextEarningResponse:
    from datetime import date as _date, timedelta as _td
    sym = symbol.upper()
    if not settings.finnhub_api_key:
        return NextEarningResponse(symbol=sym, next=None)
    today = _date.today()
    try:
        rows = await finnhub.fetch_earnings_calendar(
            sym, settings.finnhub_api_key,
            from_date=today.isoformat(),
            to_date=(today + _td(days=120)).isoformat(),
        )
    except HTTPException:
        rows = []
    if not rows:
        return NextEarningResponse(symbol=sym, next=None)
    rows.sort(key=lambda r: r.get("date") or "")
    n = rows[0]
    return NextEarningResponse(symbol=sym, next=NextEarning(
        date=n.get("date"), hour=n.get("hour"),
        eps_estimate=n.get("epsEstimate"),
        revenue_estimate=n.get("revenueEstimate"),
        year=n.get("year"), quarter=n.get("quarter"),
    ))


@router.get("/{symbol}/filings", response_model=FilingsResponse)
async def stock_filings(
    symbol: str,
    limit: int = Query(20, ge=1, le=50),
    settings: Settings = Depends(get_settings),
) -> FilingsResponse:
    symbol = symbol.upper()

    # KR branch: prefer DART when we have a corp_code for this symbol.
    if settings.dart_api_key:
        corp_code = await _kr_corp_code(symbol, settings)
        if corp_code:
            try:
                raw = await dart.fetch_recent_filings_normalized(
                    corp_code, settings.dart_api_key, days=180
                )
            except HTTPException:
                raw = []
            if raw:
                return FilingsResponse(
                    symbol=symbol,
                    cik=corp_code,
                    items=[FilingItem(**r) for r in raw[:limit]],
                )

    # US fallback via SEC EDGAR.
    if not settings.sec_user_agent:
        return FilingsResponse(symbol=symbol, cik=None, items=[])
    try:
        cik = await sec.resolve_cik(symbol, settings.sec_user_agent)
    except HTTPException:
        cik = None
    if not cik:
        return FilingsResponse(symbol=symbol, cik=None, items=[])
    try:
        raw = await sec.fetch_submissions(cik, settings.sec_user_agent, limit=limit)
    except HTTPException:
        raw = []
    return FilingsResponse(
        symbol=symbol, cik=cik, items=[FilingItem(**r) for r in raw]
    )
