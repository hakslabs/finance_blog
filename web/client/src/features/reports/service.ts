import { apiGet } from "@/lib/http";
import type { ReportListResponse, ReportResponse } from "./types";

export const reportsService = {
  list: (params: { category?: string; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.category) qs.set("category", params.category);
    if (params.limit) qs.set("limit", String(params.limit));
    const suffix = qs.toString() ? `?${qs}` : "";
    return apiGet<ReportListResponse>(`/reports${suffix}`).then(
      (r) => r.reports,
    );
  },
  detail: (id: string) =>
    apiGet<ReportResponse>(`/reports/${id}`).then((r) => r.report),
};
