import { apiGet, apiPost, apiDelete } from "@/lib/http";

export interface WatchlistItem {
  symbol: string;
  exchange?: string | null;
  note?: string | null;
  added_at?: string;
}

export const watchlistsService = {
  me: () =>
    apiGet<{ id: string | null; items: WatchlistItem[] }>(`/watchlists/me`),
  add: (item: { symbol: string; exchange?: string; note?: string }) =>
    apiPost<WatchlistItem>(`/watchlists/me/items`, item),
  remove: (symbol: string) =>
    apiDelete<void>(`/watchlists/me/items/${encodeURIComponent(symbol)}`),
};
