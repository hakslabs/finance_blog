import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/http";

export type AlertKind = "price" | "rsi" | "ma_cross" | "volume" | "macro" | "custom";
export type AlertOperator = "lt" | "lte" | "gt" | "gte" | "eq" | "cross_up" | "cross_down";

export interface Alert {
  id: string;
  instrument_id: string | null;
  kind: AlertKind;
  operator: AlertOperator;
  threshold: number;
  enabled: boolean;
  triggered_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AlertCreate {
  symbol?: string;
  instrument_id?: string;
  kind: AlertKind;
  operator: AlertOperator;
  threshold: number;
  enabled?: boolean;
}

export const alertsService = {
  list: () => apiGet<{ items: Alert[] }>("/me/alerts").then((r) => r.items),
  create: (input: AlertCreate) => apiPost<Alert>("/me/alerts", input),
  patch: (id: string, patch: Partial<Pick<Alert, "operator" | "threshold" | "enabled">>) =>
    apiPatch<Alert>(`/me/alerts/${encodeURIComponent(id)}`, patch),
  remove: (id: string) =>
    apiDelete<{ deleted: string }>(`/me/alerts/${encodeURIComponent(id)}`),
};
