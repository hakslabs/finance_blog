import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/http";

export interface Thesis {
  id: string;
  instrument_id: string;
  thesis: string;
  conviction: number | null;
  target_price: number | null;
  stop_price: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ThesisCreate {
  symbol?: string;
  instrument_id?: string;
  thesis: string;
  conviction?: number;
  target_price?: number;
  stop_price?: number;
}

export const thesesService = {
  list: () => apiGet<{ items: Thesis[] }>("/me/theses").then((r) => r.items),
  create: (input: ThesisCreate) => apiPost<Thesis>("/me/theses", input),
  patch: (id: string, patch: Partial<Pick<Thesis, "thesis" | "conviction" | "target_price" | "stop_price">>) =>
    apiPatch<Thesis>(`/me/theses/${encodeURIComponent(id)}`, patch),
  remove: (id: string) =>
    apiDelete<{ deleted: string }>(`/me/theses/${encodeURIComponent(id)}`),
};
