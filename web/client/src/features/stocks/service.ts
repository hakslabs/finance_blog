import { apiGet } from "@/lib/http";
import type { Stock } from "@/types";

export interface StocksResponse { items: Stock[] }

export const stocksService = {
  list: (market: "US" | "KR", limit = 100) =>
    apiGet<StocksResponse>(`/stocks?market=${market}&limit=${limit}`),
  get: (ticker: string) =>
    apiGet<Stock>(`/stocks/${encodeURIComponent(ticker)}`),
  bars: (ticker: string, days = 90) =>
    apiGet<{ items: { date: string; open: number; high: number; low: number; close: number; volume: number }[] }>(
      `/stocks/${encodeURIComponent(ticker)}/bars?days=${days}`,
    ),
};
