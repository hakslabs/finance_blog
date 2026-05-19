import { apiGet } from "@/lib/http";
import type { MoversResponse } from "./types";

export const moversService = {
  list: (params: { market?: "US" | "KR"; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.market) qs.set("market", params.market);
    if (params.limit) qs.set("limit", String(params.limit));
    const suffix = qs.toString() ? `?${qs}` : "";
    return apiGet<MoversResponse>(`/movers${suffix}`);
  },
};
