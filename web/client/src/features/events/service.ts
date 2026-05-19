import { apiGet } from "@/lib/http";
import type { EconomicEventsResponse } from "./types";

export const eventsService = {
  economic: (params: { from?: string; to?: string; country?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.from) qs.set("from", params.from);
    if (params.to) qs.set("to", params.to);
    if (params.country) qs.set("country", params.country);
    const suffix = qs.toString() ? `?${qs}` : "";
    return apiGet<EconomicEventsResponse>(`/events/economic${suffix}`).then(
      (r) => r.items,
    );
  },
};
