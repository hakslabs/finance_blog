import { apiGet } from "@/lib/http";
import type { NewsItem } from "@/types";
import { useAsync } from "@/features/_shared/useAsync";
import { MARKET_NEWS } from "@/services/mockData";

interface BackendNews {
  id: string;
  source: string;
  title: string;
  summary?: string;
  url?: string;
  language?: string;
  published_at: string;
  related_symbols?: string[];
}

function relTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const diff = Math.floor((Date.now() - t) / 1000);
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

let nextId = 100000;
function backendToNewsItem(n: BackendNews): NewsItem {
  return {
    id: nextId++,
    title: n.title,
    summary: n.summary ?? "",
    source: n.source,
    sourceUrl: n.url,
    time: relTime(n.published_at),
    publishedAt: n.published_at,
    category: "미국",
    tickers: n.related_symbols ?? [],
    impact: null,
    sentiment: "neutral",
  };
}

export const newsService = {
  list: async (params?: { category?: string; ticker?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.ticker) q.set("symbol", params.ticker);
    q.set("limit", String(params?.limit ?? 50));
    const r = await apiGet<{ items: BackendNews[]; updated_at?: string }>(`/news?${q}`);
    return { items: r.items.map(backendToNewsItem), updatedAt: r.updated_at ?? null };
  },
};

export function useNews(params?: { category?: string; ticker?: string; limit?: number }) {
  const r = useAsync(
    () => newsService.list(params),
    [params?.category ?? "", params?.ticker ?? "", params?.limit ?? 50],
    { items: MARKET_NEWS, updatedAt: null as string | null },
  );
  // During loading data is null — page should skeleton, not fall back
  // to the demo array. After fetch, if the server returned 0 items we
  // still surface the empty list (not a mock) so the UI shows "no news"
  // honestly. The MARKET_NEWS mock only kicks in on a fetch error.
  const data = r.data?.items ?? null;
  const updatedAt = r.data?.updatedAt ?? null;
  return { ...r, data, updatedAt };
}
