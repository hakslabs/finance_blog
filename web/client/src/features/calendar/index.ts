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
