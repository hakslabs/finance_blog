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

export const stocksService = {
  list: (market: "US" | "KR", limit = 100): Promise<StocksResponse> =>
    apiGet<MoversResponse>(`/movers?market=${market}&limit=${limit}`).then(
      (r) => ({ items: r.items.map(moverToStock) }),
    ),
  get: (ticker: string) =>
    apiGet<{ symbol: string; name: string; sector?: string }>(
      `/stocks/${encodeURIComponent(ticker)}/profile`,
    ),
  bars: (ticker: string, days = 90) =>
    apiGet<{
      items: {
        date: string;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
      }[];
    }>(`/stocks/${encodeURIComponent(ticker)}/bars?days=${days}`),
};
