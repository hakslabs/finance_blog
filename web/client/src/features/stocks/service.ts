import { apiGet } from "@/lib/http";
import type { Stock } from "@/types";

interface MoverItem {
  rank: number;
  symbol: string;
  name: string;
  market: "US" | "KR";
  last: number;
  change: number;
  change_pct: number;
  volume?: number;
}
interface MoversResponse {
  market: "US" | "KR";
  items: MoverItem[];
}

function moverToStock(m: MoverItem): Stock {
  return {
    ticker: m.symbol,
    name: m.name,
    price: m.last,
    change: m.change,
    changePct: m.change_pct,
    volume: m.volume ?? 0,
    marketCap: "",
    sector: "—",
    exchange: m.market === "US" ? "NASDAQ" : "KOSPI",
    country: m.market,
  };
}

export interface StocksResponse {
  items: Stock[];
}

export interface StockFinancialPeriod {
  year?: number | null;
  quarter?: number | null;
  period?: string | null;
  form?: string | null;
  income_statement: Record<string, unknown>[];
  balance_sheet: Record<string, unknown>[];
  cash_flow: Record<string, unknown>[];
}

export interface StockFinancialsResponse {
  symbol: string;
  freq: "annual" | "quarterly";
  periods: StockFinancialPeriod[];
}

export interface StockSearchHit {
  ticker: string;
  name: string;
  exchange: string;
  country: "US" | "KR";
  assetType?: string | null;
}

export interface StockBarsCompareSeries {
  symbol: string;
  requested_days: number;
  returned_count: number;
  from_date?: string | null;
  to_date?: string | null;
}

export interface StockBarsCompareResponse {
  symbols: string[];
  requested_days: number;
  compare_from_date?: string | null;
  compare_to_date?: string | null;
  compare_baseline_date?: string | null;
  compare_row_count?: number;
  rows: Array<Record<string, number | string | null>>;
  returns: Record<string, number>;
  series: StockBarsCompareSeries[];
}

interface SearchResponse {
  symbols: {
    symbol: string;
    name: string;
    exchange?: string | null;
    country_code?: string | null;
    asset_type?: string | null;
  }[];
}

const STOCK_BARS_MIN_DAYS = 1;
const STOCK_BARS_MAX_DAYS = 1825;

function clampStockBarsDays(days: number): number {
  if (!Number.isFinite(days)) return 90;
  return Math.min(
    STOCK_BARS_MAX_DAYS,
    Math.max(STOCK_BARS_MIN_DAYS, Math.round(days)),
  );
}

function searchHitToStockHit(
  hit: SearchResponse["symbols"][number],
): StockSearchHit {
  const ticker = hit.symbol;
  const country =
    hit.country_code === "KR" || /^\d{6}$/.test(ticker) ? "KR" : "US";
  return {
    ticker,
    name: hit.name,
    exchange: hit.exchange ?? (country === "KR" ? "KOSPI" : "NASDAQ"),
    country,
    assetType: hit.asset_type,
  };
}

export const stocksService = {
  list: (market: "US" | "KR", limit = 100): Promise<StocksResponse> =>
    apiGet<MoversResponse>(`/movers?market=${market}&limit=${limit}`).then(
      (r) => ({ items: r.items.map(moverToStock) }),
    ),
  search: (
    query: string,
    limit = 12,
    init?: RequestInit,
  ): Promise<{ items: StockSearchHit[] }> => {
    const q = query.trim();
    if (!q) return Promise.resolve({ items: [] });
    return apiGet<SearchResponse>(
      `/search?q=${encodeURIComponent(q)}&limit=${limit}`,
      init,
    ).then((r) => ({ items: r.symbols.map(searchHitToStockHit) }));
  },
  get: (ticker: string) =>
    apiGet<{ symbol: string; name: string; sector?: string }>(
      `/stocks/${encodeURIComponent(ticker)}/profile`,
    ),
  bars: (ticker: string, days = 90, init?: RequestInit) => {
    const safeDays = clampStockBarsDays(days);
    return apiGet<{
      items: {
        date: string;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
      }[];
      requested_days?: number;
      returned_count?: number;
      from_date?: string | null;
      to_date?: string | null;
      instrument_count?: number;
      raw_count?: number;
      duplicate_count?: number;
    }>(`/stocks/${encodeURIComponent(ticker)}/bars?days=${safeDays}`, init);
  },
  compareBars: (
    tickers: string[],
    days = 365,
    init?: RequestInit,
  ): Promise<StockBarsCompareResponse> => {
    const safeDays = clampStockBarsDays(days);
    const symbols = tickers
      .map((ticker) => ticker.trim().toUpperCase())
      .filter(Boolean)
      .join(",");
    if (!symbols) {
      return Promise.resolve({
        symbols: [],
        requested_days: safeDays,
        compare_from_date: null,
        compare_to_date: null,
        compare_baseline_date: null,
        compare_row_count: 0,
        rows: [],
        returns: {},
        series: [],
      });
    }
    return apiGet<StockBarsCompareResponse>(
      `/stocks/bars/compare?symbols=${encodeURIComponent(symbols)}&days=${safeDays}`,
      init,
    );
  },
  financials: (
    ticker: string,
    freq: "annual" | "quarterly" = "annual",
    init?: RequestInit,
  ) =>
    apiGet<StockFinancialsResponse>(
      `/stocks/${encodeURIComponent(ticker)}/financials?freq=${freq}`,
      init,
    ),
};
