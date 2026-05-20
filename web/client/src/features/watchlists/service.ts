import { apiDelete, apiGet, apiPost } from "@/lib/http";

export interface WatchlistItem {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  last_price: number | null;
  last_price_at: string | null;
  note: string | null;
}

export interface Watchlist {
  id: string;
  name: string;
  updated_at: string;
  items: WatchlistItem[];
}

export const watchlistsService = {
  getMine: () =>
    apiGet<{ watchlist: Watchlist }>("/watchlists/me").then((r) => r.watchlist),
  addItem: (symbol: string, exchange?: string, note?: string) =>
    apiPost<{ watchlist: Watchlist }>("/watchlists/me/items", {
      symbol,
      exchange,
      note,
    }).then((r) => r.watchlist),
  removeItem: (symbol: string, exchange?: string) => {
    const qs = exchange ? `?exchange=${encodeURIComponent(exchange)}` : "";
    return apiDelete<{ watchlist: Watchlist }>(
      `/watchlists/me/items/${encodeURIComponent(symbol)}${qs}`,
    ).then((r) => r.watchlist);
  },
};
