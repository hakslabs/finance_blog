import { apiGet } from "@/lib/http";
import type { MacroIndicator } from "@/types";
import { useAsync } from "@/features/_shared/useAsync";

interface BackendMacroIndicator {
  series_id: string;
  label: string;
  country_code: "US" | "KR" | string;
  unit: string;
  date?: string | null;
  value?: number | null;
  previous_value?: number | null;
  change?: number | null;
}

export interface MacroHistoryPoint {
  date: string;
  value: number;
}

export interface MacroHistoryResponse {
  series_id: string;
  label: string;
  unit: string;
  country_code: string;
  items: MacroHistoryPoint[];
}

function clampMacroHistoryLimit(limit: number): number {
  if (!Number.isFinite(limit)) return 1825;
  return Math.min(1825, Math.max(10, Math.floor(limit)));
}

function categoryFor(label: string): MacroIndicator["category"] {
  if (/금리|국채|DFF|DGS/.test(label)) return "금리";
  if (/CPI|물가/.test(label)) return "물가";
  if (/실업|고용/.test(label)) return "고용";
  if (/GDP|성장/.test(label)) return "성장";
  if (/환율|달러|VIX/.test(label)) return "환율";
  return "원자재";
}

function frequencyFor(seriesId: string): MacroIndicator["updateFrequency"] {
  if (seriesId.includes("901Y009")) return "monthly";
  if (seriesId.includes("200Y001")) return "quarterly";
  if (["DFF", "DGS10", "DEXKOUS", "VIXCLS"].includes(seriesId)) return "daily";
  return "monthly";
}

function sourceFor(seriesId: string): string {
  if (seriesId.startsWith("ECOS:")) return "한국은행 ECOS";
  if (seriesId === "CPIAUCSL" || seriesId === "UNRATE") return "FRED/BLS";
  if (seriesId === "DGS10") return "FRED/US Treasury";
  if (seriesId === "DFF") return "FRED/Federal Reserve";
  return "FRED";
}

function mapBackendIndicator(row: BackendMacroIndicator): MacroIndicator {
  const value = row.value ?? 0;
  const previous = row.previous_value ?? value;
  const change = row.change ?? value - previous;
  const trend: MacroIndicator["trend"] =
    Math.abs(change) < 1e-9 ? "flat" : change > 0 ? "up" : "down";
  const category = categoryFor(row.label);
  const country =
    row.country_code === "US" || row.country_code === "KR"
      ? row.country_code
      : "GLOBAL";
  return {
    id: row.series_id,
    name: row.label,
    value: value.toFixed(row.unit === "₩" ? 2 : 2),
    numValue: value,
    prev: previous.toFixed(row.unit === "₩" ? 2 : 2),
    status: trend === "flat" ? "보합" : trend === "up" ? "상승" : "하락",
    good: category === "물가" || category === "금리" ? trend !== "up" : null,
    unit: row.unit === "idx" ? "" : row.unit,
    trend,
    country,
    category,
    description: `${row.label} 최신 관측값${row.date ? ` (${row.date})` : ""}`,
    source: sourceFor(row.series_id),
    updateFrequency: frequencyFor(row.series_id),
  };
}

export const macroService = {
  list: () =>
    apiGet<{ indicators: BackendMacroIndicator[] }>(`/macros/indicators`).then(
      (r) => ({ items: r.indicators.map(mapBackendIndicator) }),
    ),
  history: (seriesId: string, limit = 1825, init?: RequestInit) =>
    apiGet<MacroHistoryResponse>(
      `/macros/indicators/${encodeURIComponent(seriesId)}/history?limit=${clampMacroHistoryLimit(limit)}`,
      init,
    ),
};

export function useMacroIndicators() {
  return useAsync(() => macroService.list().then((r) => r.items), [], [], {
    refreshInterval: 900000, // 15min — server caches FRED/ECOS; macros move slowly
  });
}
