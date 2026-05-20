import { apiGet } from "@/lib/http";
import type { Report } from "@/types";
import { useAsync } from "@/features/_shared/useAsync";
import { REPORTS } from "@/services/mockData";

export const reportsService = {
  list: (params?: { category?: string; ticker?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.category) q.set("category", params.category);
    if (params?.ticker) q.set("ticker", params.ticker);
    q.set("limit", String(params?.limit ?? 50));
    return apiGet<{ items: Report[] }>(`/reports?${q}`);
  },
  get: (id: string) => apiGet<Report>(`/reports/${encodeURIComponent(id)}`),
};

export function useReports(params?: { category?: string; ticker?: string; limit?: number }) {
  return useAsync(
    () => reportsService.list(params).then((r) => (r.items.length ? r.items : REPORTS)),
    [params?.category ?? "", params?.ticker ?? "", params?.limit ?? 50],
    REPORTS,
  );
}
