import { useCallback, useEffect, useState } from "react";
import { memosService, type Memo, type MemoCreate, type MemoTargetKind } from "./service";
import { useAuth } from "@/contexts/AuthContext";

/**
 * 특정 target_kind/target_id 에 묶인 메모 목록을 서버에서 불러온다.
 * 로그인된 사용자만 서버 호출, 비로그인 시 빈 배열.
 * add/patch/remove 는 optimistic update + 실패 시 reload.
 */
export function useMemos(opts: { target_kind?: MemoTargetKind; target_id?: string }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!user) { setItems([]); return; }
    setLoading(true);
    setError(null);
    try {
      const got = await memosService.list(opts);
      setItems(got);
    } catch (e) {
      setError(e instanceof Error ? e.message : "메모 로딩 실패");
    } finally {
      setLoading(false);
    }
  }, [user, opts.target_kind, opts.target_id]);

  useEffect(() => { void reload(); }, [reload]);

  const add = useCallback(async (input: MemoCreate) => {
    try {
      const created = await memosService.create(input);
      setItems((prev) => [created, ...prev]);
      return created;
    } catch (e) {
      void reload();
      throw e;
    }
  }, [reload]);

  const patch = useCallback(async (id: string, body: string) => {
    const prev = items;
    setItems((cur) => cur.map((m) => (m.id === id ? { ...m, body } : m)));
    try {
      await memosService.patch(id, body);
    } catch (e) {
      setItems(prev);
      throw e;
    }
  }, [items]);

  const remove = useCallback(async (id: string) => {
    const prev = items;
    setItems((cur) => cur.filter((m) => m.id !== id));
    try {
      await memosService.remove(id);
    } catch (e) {
      setItems(prev);
      throw e;
    }
  }, [items]);

  return { items, loading, error, add, patch, remove, reload };
}
