import { apiGet } from "@/lib/http";
import type { NewsResponse } from "./types";

export const newsService = {
  list: (params: { limit?: number; symbol?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.symbol) qs.set("symbol", params.symbol);
    const suffix = qs.toString() ? `?${qs}` : "";
    return apiGet<NewsResponse>(`/news${suffix}`).then((r) => r.items);
  },
};
