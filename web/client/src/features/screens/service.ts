import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/http";

export interface Screen {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
}

export const screensService = {
  list: () => apiGet<{ items: Screen[] }>("/me/screens").then((r) => r.items),
  create: (name: string, filters: Record<string, unknown> = {}) =>
    apiPost<Screen>("/me/screens", { name, filters }),
  patch: (id: string, patch: Partial<Pick<Screen, "name" | "filters">>) =>
    apiPatch<Screen>(`/me/screens/${encodeURIComponent(id)}`, patch),
  remove: (id: string) =>
    apiDelete<{ deleted: string }>(`/me/screens/${encodeURIComponent(id)}`),
};
