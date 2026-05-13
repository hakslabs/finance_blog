# Data Sources

Decision table for every external data domain Finance_lab depends on. Each row picks a **primary** provider and a **fallback**, with the trigger to add the fallback. Adding a new provider requires a row here first.

## Selection Principles

- Free, **official** APIs only. No scraped or library-wrapped unofficial sources as primary. (yfinance was rejected for this reason — Yahoo blocks it intermittently.)
- Server-side only. Provider keys never ride in browser bundles. Routed through FastAPI.
- One primary per domain at any time. The fallback is a circuit, not a parallel call.

## Tracking Universe (MVP)

- US: **S&P 500 + Nasdaq 100** → ~520 unique tickers.
- KR: **KOSPI 200** → ~200 tickers.
- Total ~720 symbols, daily EOD only.

## Provider Matrix

| Domain                                                | Primary                                              | Fallback                                | Reason for fallback                 | Used by    |
| ----------------------------------------------------- | ---------------------------------------------------- | --------------------------------------- | ----------------------------------- | ---------- |
| US stock daily OHLCV                                  | **Polygon.io** (`POLYGON_API_KEY`)                   | Alpha Vantage (`ALPHA_VANTAGE_API_KEY`) | Polygon outage; per-symbol top-ups  | PR-10      |
| KR stock daily OHLCV                                  | **KRX OpenAPI** (`KRX_API_KEY`)                      | pykrx (no key)                          | KRX OpenAPI outage or schema change | PR-10      |
| Universe membership (S&P500 / Nasdaq100 constituents) | Polygon reference endpoints + maintained static seed | manual update                           | Slow change cadence                 | PR-08 seed |
| Universe membership (KOSPI200 constituents)           | KRX OpenAPI constituent endpoint                     | manual update                           | Slow change cadence                 | PR-08 seed |
| US macro indicators                                   | FRED (`FRED_API_KEY`)                                | —                                       | Canonical                           | post-MVP   |
| KR macro indicators                                   | 한국은행 ECOS (`ECOS_API_KEY`)                       | —                                       | Canonical                           | post-MVP   |
| US filings (10-K, 10-Q, 13F)                          | SEC EDGAR (no key; `SEC_USER_AGENT` required)        | —                                       | Public                              | post-MVP   |
| KR filings / financials                               | DART (`DART_API_KEY`)                                | —                                       | Canonical                           | post-MVP   |
| Document parsing (PDFs, reports)                      | `docling` MCP                                        | docling CLI                             | Long-running; see MCP-ROUTING       | post-MVP   |

## Per-Provider Notes

### Polygon.io (`POLYGON_API_KEY`) — US primary

- Signup: https://polygon.io/dashboard/signup (free, instant).
- Free tier limits: **5 calls/min**, 2-year historical depth, end-of-day data, US stocks/options/forex.
- Killer endpoint: **`GET /v2/aggs/grouped/locale/us/market/stocks/{date}`** returns OHLCV for **every US-listed stock** for a single trading day in one call. So our daily cron is **1 API call covering all 520 US symbols**, not 520 calls.
- Daily cron at market close: 1 call → filter to our universe → upsert. Done in seconds.
- Backfill 2 years: 500 trading days × 1 call = 500 calls. At 5/min that's ~100 minutes; one-time, run overnight.
- Constituent universe (S&P500 / Nasdaq100): use Polygon reference endpoints, refresh weekly. Membership rarely changes.

### KRX OpenAPI (`KRX_API_KEY`) — KR primary

- Portal: http://openapi.krx.co.kr (KRX 정보데이터 OpenAPI).
- Signup: KRX membership + API key request. Free, key is approved within ~1 business day in most cases.
- Endpoints we need:
  - 주식 시세 (KOSPI/KOSDAQ 일별 시세) — for KOSPI 200 daily OHLCV.
  - 지수 구성종목 (KOSPI 200 구성종목 리스트) — for universe membership.
- Cron pattern: one call per index (`KOSPI200`) returns all 200 constituents' EOD bars for the target date. Daily cron is **1–2 API calls covering all 200 KR symbols**.
- Apply for the key **now**, in parallel with everything else, because of the 1-day approval.

### Alpha Vantage (`ALPHA_VANTAGE_API_KEY`) — US fallback

- Signup: https://www.alphavantage.co/support/#api-key (instant).
- Limits: 5 req/min, 500/day.
- Role: per-symbol top-up when Polygon is unreachable or a specific symbol is missing. With 5/min × 60 min = 300 symbols/hour worst case — fine for emergency.
- Already wired as the `alphavantage` MCP server in opencode.

### pykrx — KR fallback

- Library, no key. Scrapes data.krx.co.kr endpoints — KRX itself, just unofficial wrapper.
- Adopt only when KRX OpenAPI is down or returns a schema we cannot parse.
- Pin to a tested version in `pyproject.toml`.

### FRED (`FRED_API_KEY`)

- Free signup, instant: https://fred.stlouisfed.org/docs/api/api_key.html.
- Limit: 120 req/min, very generous.
- Series: CPI, unemployment, treasury yields, dollar index, etc.

### 한국은행 ECOS (`ECOS_API_KEY`)

- Free signup, ~1 business day approval: https://ecos.bok.or.kr/api/.
- Limit: 10,000 req/day.
- Apply early.

### SEC EDGAR (`SEC_USER_AGENT`)

- No key. SEC requires `User-Agent` with contact email — e.g. `"Finance_lab Research <hi@haklee.me>"`.
- Limit: 10 req/sec.
- 13F + US filings.

### DART (`DART_API_KEY`)

- Free signup, instant: https://opendart.fss.or.kr/.
- Limit: 10,000 req/day.
- KR filings + financial statements.

## Capacity Sanity Check

With this stack, daily EOD cron for 720 symbols costs:

- US: 1 Polygon call.
- KR: 1–2 KRX calls.
- Total: ~3 API calls per day for the entire price pipeline. Well under every free-tier ceiling.

Backfill 2 years of history (one-time):

- US: ~100 minutes via Polygon (5 calls/min × 500 days).
- KR: ~1–2 minutes via KRX (200 days × 1 call/day for the index batch, fast endpoint).

Storage projection on Supabase free (500 MB):

- 720 symbols × ~250 trading days/year × ~100 bytes/row ≈ 18 MB/year. Headroom for ~25 years before tier matters.

## Deferred / Out Of Scope

- **KIS OpenAPI (한국투자증권)** — keep noted in case real-time KR or non-EOD bars become a goal. Not adopted now.
- **yfinance** — removed entirely. Do not reintroduce without an EP.
- **Intraday / minute bars** — would blow free-tier storage. Not in scope.
- **Real-time quotes** — different provider class (delayed feeds, websocket); out of scope for MVP.

## Procurement Order

1. **KRX OpenAPI key** — apply now (1-day approval).
2. **ECOS key** — apply now (1-day approval).
3. Polygon, Alpha Vantage, FRED, DART, SEC user-agent — all instant; do in one sitting.

## When To Switch Primary → Fallback

Document the switch in an EP before flipping. Triggers:

- Primary fails > 5% of calls over a week.
- Primary's free-tier ceiling is consistently hit.
- Primary's data gap is visible on screen and unfixable in the app layer.
