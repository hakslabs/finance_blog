import { apiGet } from "@/lib/http";
import type { Report } from "@/types";
import { useAsync } from "@/features/_shared/useAsync";
import { REPORTS } from "@/services/mockData";

interface BackendReport {
  id: string;
  source: string;
  title: string;
  category?: string;
  published_at: string;
  language?: string;
  importance?: number;
  summary?: string;
  tickers?: string[];
}

const CATEGORY_MAP: Record<string, Report["category"]> = {
  거시: "거시경제", 산업: "산업분석", 종목: "종목분석", "13F": "13F", 채권: "채권", 퀀트: "퀀트",
};

function backendToReport(r: BackendReport): Report {
  return {
    id: r.id,
    title: r.title,
    institution: r.source,
    date: r.published_at,
    category: (CATEGORY_MAP[r.category ?? ""] ?? "거시경제"),
    summary: r.summary ?? "",
    tickers: r.tickers,
    tags: [],
  };
}

export const reportsService = {
  list: async (params?: { category?: string; ticker?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.category) q.set("category", params.category);
    q.set("limit", String(params?.limit ?? 50));
    const r = await apiGet<{ reports?: BackendReport[]; items?: BackendReport[] }>(`/reports?${q}`);
    const rows = r.reports ?? r.items ?? [];
    return { items: rows.map(backendToReport) };
  },
  get: async (id: string) => {
    const r = await apiGet<BackendReport | { report: BackendReport }>(`/reports/${encodeURIComponent(id)}`);
    const row = "report" in r ? r.report : r;
    return backendToReport(row);
  },
};

export function useReports(params?: { category?: string; ticker?: string; limit?: number }) {
  return useAsync(
    () => reportsService.list(params).then((r) => r.items),
    [params?.category ?? "", params?.ticker ?? "", params?.limit ?? 50],
    REPORTS,
  );
}
