import { apiGet } from "@/lib/http";
import type { NewsItem } from "@/types";
import { useAsync } from "@/features/_shared/useAsync";
import { MARKET_NEWS } from "@/services/mockData";

export const newsService = {
  list: (params?: { category?: string; ticker?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.category) q.set("category", params.category);
    if (params?.ticker) q.set("ticker", params.ticker);
    q.set("limit", String(params?.limit ?? 50));
    return apiGet<{ items: NewsItem[] }>(`/news?${q}`);
  },
};

export function useNews(params?: { category?: string; ticker?: string; limit?: number }) {
  return useAsync(
    () => newsService.list(params).then((r) => (r.items.length ? r.items : MARKET_NEWS)),
    [params?.category ?? "", params?.ticker ?? "", params?.limit ?? 50],
    MARKET_NEWS,
  );
}
