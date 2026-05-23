import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/http";
import { useAsync } from "@/features/_shared/useAsync";
import { useAuth } from "@/contexts/AuthContext";

export type MemoKind =
  | "stock"
  | "master"
  | "report"
  | "calendar_event"
  | "sector"
  | "free";

export interface Memo {
  id: string;
  target_kind: MemoKind;
  target_ref?: string | null;
  title?: string | null;
  body: string;
  linked_trade_ids?: string[] | null;
  tags?: string[] | null;
  created_at?: string;
  updated_at?: string;
}

export const memosService = {
  list: (params?: {
    target_kind?: MemoKind;
    target_ref?: string;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.target_kind) q.set("target_kind", params.target_kind);
    if (params?.target_ref) q.set("target_ref", params.target_ref);
    if (params?.limit) q.set("limit", String(params.limit));
    return apiGet<{ items: Memo[] }>(`/me/memos${q.toString() ? `?${q}` : ""}`);
  },
  create: (body: Omit<Memo, "id" | "created_at" | "updated_at">) =>
    apiPost<Memo>(`/me/memos`, body),
  update: (
    id: string,
    body: Partial<Pick<Memo, "title" | "body" | "linked_trade_ids" | "tags">>,
  ) => apiPatch<Memo>(`/me/memos/${id}`, body),
  remove: (id: string) => apiDelete<void>(`/me/memos/${id}`),
};

export function useMemos(params?: {
  target_kind?: MemoKind;
  target_ref?: string;
}) {
  const { user } = useAuth();
  return useAsync(
    () =>
      user
        ? memosService.list(params).then((r) => r.items)
        : Promise.resolve([]),
    [user?.id, params?.target_kind ?? "", params?.target_ref ?? ""],
    [],
  );
}
