import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/http";

export type MemoTargetKind =
  | "instrument"
  | "transaction"
  | "report"
  | "master"
  | "news"
  | "filing";

export interface Memo {
  id: string;
  target_kind: MemoTargetKind;
  target_id: string | null;
  body: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface MemoCreate {
  target_kind: MemoTargetKind;
  target_id?: string;
  body: string;
}

export const memosService = {
  list: (opts?: { target_kind?: MemoTargetKind; target_id?: string }) => {
    const params = new URLSearchParams();
    if (opts?.target_kind) params.set("target_kind", opts.target_kind);
    if (opts?.target_id) params.set("target_id", opts.target_id);
    const qs = params.toString();
    return apiGet<{ items: Memo[] }>(`/me/memos${qs ? `?${qs}` : ""}`).then((r) => r.items);
  },
  create: (input: MemoCreate) => apiPost<Memo>("/me/memos", input),
  patch: (id: string, body: string) =>
    apiPatch<Memo>(`/me/memos/${encodeURIComponent(id)}`, { body }),
  remove: (id: string) =>
    apiDelete<{ deleted: string }>(`/me/memos/${encodeURIComponent(id)}`),
};
