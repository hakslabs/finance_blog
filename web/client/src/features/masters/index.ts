import { apiGet } from "@/lib/http";
import type { Master } from "@/types";
import { useAsync } from "@/features/_shared/useAsync";
import { MASTERS } from "@/services/mockData";

export const mastersService = {
  list: () => apiGet<{ items: Master[] }>(`/masters`),
  get: (id: string) => apiGet<Master>(`/masters/${encodeURIComponent(id)}`),
};

export function useMasters() {
  return useAsync(
    () => mastersService.list().then((r) => r.items),
    [],
    MASTERS,
  );
}

export function useMaster(id: string | undefined) {
  const fallback = id ? (MASTERS.find((m) => m.id === id) ?? null) : null;
  return useAsync(
    () => (id ? mastersService.get(id) : Promise.reject(new Error("no id"))),
    [id],
    fallback,
  );
}
