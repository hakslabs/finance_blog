import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/http";
import { useAsync } from "@/features/_shared/useAsync";
import { useAuth } from "@/contexts/AuthContext";

export interface Alert {
  id: string;
  symbol: string;
  alert_type: "target" | "stoploss" | "volume" | "news" | "earnings";
  condition: string;
  target_value: number;
  current_value?: number | null;
  is_active: boolean;
  triggered_at?: string | null;
  created_at?: string;
}

export const alertsService = {
  list: (symbol?: string) =>
    apiGet<{ items: Alert[] }>(
      `/me/alerts${symbol ? `?symbol=${encodeURIComponent(symbol)}` : ""}`,
    ),
  create: (body: Omit<Alert, "id" | "created_at" | "triggered_at">) =>
    apiPost<Alert>(`/me/alerts`, body),
  update: (
    id: string,
    body: Partial<Pick<Alert, "condition" | "target_value" | "is_active">>,
  ) => apiPatch<Alert>(`/me/alerts/${id}`, body),
  remove: (id: string) => apiDelete<void>(`/me/alerts/${id}`),
};

export function useAlerts(symbol?: string) {
  const { user } = useAuth();
  return useAsync(
    () =>
      user
        ? alertsService.list(symbol).then((r) => r.items)
        : Promise.resolve([]),
    [user?.id, symbol ?? ""],
    [],
  );
}
