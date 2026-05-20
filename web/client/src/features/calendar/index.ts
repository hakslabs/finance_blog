import { apiGet } from "@/lib/http";
import type { CalendarEvent } from "@/types";
import { useAsync } from "@/features/_shared/useAsync";
import { CALENDAR_EVENTS } from "@/services/mockData";

export const calendarService = {
  list: (params?: { from?: string; to?: string; type?: string; ticker?: string }) => {
    const q = new URLSearchParams();
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    if (params?.type) q.set("type", params.type);
    if (params?.ticker) q.set("ticker", params.ticker);
    return apiGet<{ items: CalendarEvent[] }>(`/events?${q}`);
  },
};

export function useCalendarEvents(params?: { from?: string; to?: string; type?: string; ticker?: string }) {
  return useAsync(
    () => calendarService.list(params).then((r) => (r.items.length ? r.items : CALENDAR_EVENTS)),
    [params?.from ?? "", params?.to ?? "", params?.type ?? "", params?.ticker ?? ""],
    CALENDAR_EVENTS,
  );
}

// ── Unified calendar (macro + earnings + dividend) ─────────────
export type UnifiedCalendarItem = {
  id: string;
  kind: "macro" | "earnings" | "dividend";
  title: string;
  scheduled_at: string;
  country_code?: string | null;
  symbol?: string | null;
  symbol_name?: string | null;
  importance?: number | null;
  detail?: string | null;
  actual_value?: string | null;
  forecast_value?: string | null;
  previous_value?: string | null;
  cash_amount?: number | null;
  eps_estimate?: number | null;
  revenue_estimate?: number | null;
};

export type UnifiedCalendarResponse = {
  from: string;
  to: string;
  items: UnifiedCalendarItem[];
};

export type UnifiedCalendarParams = {
  from?: string;
  to?: string;
  types?: ("macro" | "earnings" | "dividend")[];
  symbols?: string[];
  recommended?: boolean;
  minImportance?: 1 | 2 | 3;
};

export function fetchUnifiedCalendar(p: UnifiedCalendarParams = {}) {
  const q = new URLSearchParams();
  if (p.from) q.set("from", p.from);
  if (p.to) q.set("to", p.to);
  if (p.types && p.types.length) q.set("types", p.types.join(","));
  if (p.symbols && p.symbols.length) q.set("symbols", p.symbols.join(","));
  if (p.minImportance) q.set("min_importance", String(p.minImportance));
  if (p.recommended) q.set("recommended", "1");
  return apiGet<UnifiedCalendarResponse>(`/calendar?${q}`);
}

export function useUnifiedCalendar(p: UnifiedCalendarParams = {}) {
  const symbolsKey = (p.symbols ?? []).join(",");
  const typesKey = (p.types ?? []).join(",");
  return useAsync(
    () => fetchUnifiedCalendar(p).then((r) => r.items),
    [p.from ?? "", p.to ?? "", typesKey, symbolsKey, p.recommended ? "1" : "0", String(p.minImportance ?? "")],
    [] as UnifiedCalendarItem[],
  );
}
