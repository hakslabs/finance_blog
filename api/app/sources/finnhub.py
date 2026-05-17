"""Finnhub provider — company news, profile, recommendation trends,
basic financials. Free tier allows 60 req/min.

All functions raise HTTPException(503) on upstream error so callers can
return an empty payload to the UI without crashing the page.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx
from fastapi import HTTPException

BASE_URL = "https://finnhub.io/api/v1"


class FinnhubError(Exception):
    pass


async def _get(path: str, params: Dict[str, Any], api_key: str) -> Any:
    params = {**params, "token": api_key}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{BASE_URL}{path}", params=params)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail="upstream_unavailable") from exc
    if resp.status_code == 429:
        raise HTTPException(status_code=429, detail="rate_limited")
    if resp.status_code >= 400:
        raise HTTPException(status_code=503, detail="upstream_unavailable")
    return resp.json()


async def fetch_company_news(
    symbol: str, api_key: str, days: int = 14
) -> List[Dict[str, Any]]:
    today = datetime.now(tz=timezone.utc).date()
    start = today - timedelta(days=days)
    data = await _get(
        "/company-news",
        {"symbol": symbol, "from": start.isoformat(), "to": today.isoformat()},
        api_key,
    )
    if not isinstance(data, list):
        return []
    items: List[Dict[str, Any]] = []
    for row in data[:30]:
        items.append(
            {
                "id": str(row.get("id") or row.get("url") or row.get("datetime")),
                "headline": row.get("headline", ""),
                "summary": row.get("summary", ""),
                "source": row.get("source", ""),
                "url": row.get("url", ""),
                "category": row.get("category", ""),
                "datetime": datetime.fromtimestamp(
                    int(row.get("datetime", 0)), tz=timezone.utc
                ).isoformat()
                if row.get("datetime")
                else None,
                "image": row.get("image") or None,
            }
        )
    return items


async def fetch_company_profile(symbol: str, api_key: str) -> Optional[Dict[str, Any]]:
    data = await _get("/stock/profile2", {"symbol": symbol}, api_key)
    if not isinstance(data, dict) or not data:
        return None
    return {
        "name": data.get("name"),
        "country": data.get("country"),
        "currency": data.get("currency"),
        "exchange": data.get("exchange"),
        "industry": data.get("finnhubIndustry"),
        "ipo": data.get("ipo"),
        "market_cap": data.get("marketCapitalization"),
        "share_outstanding": data.get("shareOutstanding"),
        "logo": data.get("logo"),
        "weburl": data.get("weburl"),
        "phone": data.get("phone"),
    }


async def fetch_recommendation_trends(
    symbol: str, api_key: str
) -> List[Dict[str, Any]]:
    data = await _get("/stock/recommendation", {"symbol": symbol}, api_key)
    if not isinstance(data, list):
        return []
    out: List[Dict[str, Any]] = []
    for row in data[:6]:
        out.append(
            {
                "period": row.get("period"),
                "strong_buy": row.get("strongBuy", 0),
                "buy": row.get("buy", 0),
                "hold": row.get("hold", 0),
                "sell": row.get("sell", 0),
                "strong_sell": row.get("strongSell", 0),
            }
        )
    return out


async def fetch_price_target(symbol: str, api_key: str) -> Optional[Dict[str, Any]]:
    data = await _get("/stock/price-target", {"symbol": symbol}, api_key)
    if not isinstance(data, dict) or not data:
        return None
    return {
        "target_high": data.get("targetHigh"),
        "target_low": data.get("targetLow"),
        "target_mean": data.get("targetMean"),
        "target_median": data.get("targetMedian"),
        "last_updated": data.get("lastUpdated"),
        "number_of_analysts": data.get("numberOfAnalysts"),
    }


async def fetch_financials_reported(
    symbol: str, api_key: str, *, freq: str = "annual"
) -> List[Dict[str, Any]]:
    data = await _get(
        "/stock/financials-reported", {"symbol": symbol, "freq": freq}, api_key
    )
    if not isinstance(data, dict):
        return []
    rows = data.get("data") or []
    out: List[Dict[str, Any]] = []
    for row in rows[:5]:
        report = row.get("report") if isinstance(row.get("report"), dict) else {}
        out.append(
            {
                "year": row.get("year"),
                "quarter": row.get("quarter"),
                "period": row.get("endDate"),
                "form": row.get("form"),
                "bs": report.get("bs") or [],
                "ic": report.get("ic") or [],
                "cf": report.get("cf") or [],
            }
        )
    return out


async def fetch_economic_calendar(
    api_key: str, *, from_date: str, to_date: str
) -> List[Dict[str, Any]]:
    """Finnhub /calendar/economic.

    Response shape: { "economicCalendar": [ { country, time, event,
                                              impact, actual, prev,
                                              estimate, unit }... ] }
    """
    data = await _get(
        "/calendar/economic",
        {"from": from_date, "to": to_date},
        api_key,
    )
    if not isinstance(data, dict):
        return []
    rows = data.get("economicCalendar") or data.get("economicCalender") or []
    out: List[Dict[str, Any]] = []
    for r in rows:
        out.append(
            {
                "time": r.get("time"),
                "country": r.get("country"),
                "event": r.get("event"),
                "impact": r.get("impact"),
                "actual": r.get("actual"),
                "estimate": r.get("estimate"),
                "prev": r.get("prev"),
                "unit": r.get("unit"),
            }
        )
    return out


async def fetch_basic_financials(symbol: str, api_key: str) -> Dict[str, Any]:
    data = await _get(
        "/stock/metric", {"symbol": symbol, "metric": "all"}, api_key
    )
    if not isinstance(data, dict):
        return {}
    metric = data.get("metric", {}) if isinstance(data.get("metric"), dict) else {}
    return {
        "pe_ttm": metric.get("peTTM"),
        "pb": metric.get("pbAnnual"),
        "roe_ttm": metric.get("roeTTM"),
        "dividend_yield": metric.get("dividendYieldIndicatedAnnual"),
        "beta": metric.get("beta"),
        "week52_high": metric.get("52WeekHigh"),
        "week52_low": metric.get("52WeekLow"),
        "current_ratio": metric.get("currentRatioAnnual"),
        "debt_equity": metric.get("totalDebt/totalEquityAnnual"),
        "eps_ttm": metric.get("epsTTM"),
        "revenue_per_share_ttm": metric.get("revenuePerShareTTM"),
    }
