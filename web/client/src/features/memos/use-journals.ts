/**
 * useJournals — 투자일지(Journal[]) hook.
 *
 * 로그인 사용자 + tradeId 가 UUID 형식인 항목은 memos(target_kind='transaction')
 * 에 JSON 직렬화하여 영속. 그 외(mock·미연동)는 localStorage 만 사용.
 *
 * UI 호환을 위해 useLocalState 와 동일한 시그니처(`[state, setState]`)를 제공한다.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { memosService } from "./service";

export interface JournalShape {
  id: string;
  tradeId?: string;
  isMock?: boolean;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (s?: string) => Boolean(s && UUID_RE.test(s));

export function useJournals<T extends JournalShape>(
  storageKey: string,
  initial: T[],
): [T[], (updater: T[] | ((prev: T[]) => T[])) => void] {
  const { user } = useAuth();
  const [items, setItems] = useState<T[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as T[]) : initial;
    } catch { return initial; }
  });

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(items)); } catch { /* ignore */ }
  }, [items, storageKey]);

  // mount-once: 서버에서 hydrate.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!user) { hydratedRef.current = false; return; }
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    (async () => {
      try {
        const memos = await memosService.list({ target_kind: "transaction" });
        const fromServer: T[] = [];
        for (const m of memos) {
          try {
            const parsed = JSON.parse(m.body) as T;
            fromServer.push({ ...parsed, id: m.id } as T);
          } catch { /* skip malformed */ }
        }
        setItems((prev) => {
          const serverIds = new Set(fromServer.map((x) => x.id));
          const localOnly = prev.filter((x) => !serverIds.has(x.id));
          return [...fromServer, ...localOnly];
        });
      } catch { /* 서버 실패 시 로컬 유지 */ }
    })();
  }, [user]);

  // 백엔드에 mirror — items 변경 시 새로 추가된 항목만 POST.
  const knownIdsRef = useRef<Set<string>>(new Set(items.map(i => i.id)));
  useEffect(() => {
    if (!user) return;
    const known = knownIdsRef.current;
    const newItems = items.filter(i => !known.has(i.id));
    if (!newItems.length) return;
    for (const it of newItems) {
      known.add(it.id);
      if (it.isMock) continue;  // mock 항목은 서버에 보내지 않음
      if (!isUuid(it.tradeId)) continue;  // tradeId 없거나 mock id 면 skip
      const tradeId = it.tradeId as string;
      memosService.create({
        target_kind: "transaction",
        target_id: tradeId,
        body: JSON.stringify(it),
      }).then((created) => {
        // 서버 id 로 교체
        setItems(prev => prev.map(x => x.id === it.id ? ({ ...x, id: created.id } as T) : x));
        known.add(created.id);
      }).catch(() => { /* 실패 시 로컬만 유지 */ });
    }
  }, [items, user]);

  const update = useCallback((updater: T[] | ((prev: T[]) => T[])) => {
    setItems((prev) => typeof updater === "function" ? (updater as (p: T[]) => T[])(prev) : updater);
  }, []);

  return [items, update];
}
