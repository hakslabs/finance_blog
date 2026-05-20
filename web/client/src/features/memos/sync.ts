/**
 * MyPage Journal ↔ backend user_memos translation + sync.
 *
 * Journal is rich (target/stopLoss/status/followUps) so we serialize the
 * structured payload into body as JSON and use tags for symbol/status
 * search facets. linked_trade_ids carries the trade FK.
 */
import { useEffect, useRef } from "react";
import { memosService, type Memo } from "@/features/memos";
import { useAuth } from "@/contexts/AuthContext";

export interface LocalJournal {
  id: string;
  date: string;
  symbol: string;
  name: string;
  type: "매수" | "매도";
  reason: string;
  target: number;
  stopLoss: number;
  status: "진행중" | "완료" | "손절";
  tradeId?: string;
  isMock: boolean;
  followUps: { date: string; note: string }[];
}

interface SerializedBody {
  reason: string;
  type: "매수" | "매도";
  target: number;
  stopLoss: number;
  status: LocalJournal["status"];
  isMock: boolean;
  followUps: LocalJournal["followUps"];
  date: string;
  name: string;
}

export function journalToMemo(j: LocalJournal): Parameters<typeof memosService.create>[0] {
  const body: SerializedBody = {
    reason: j.reason,
    type: j.type,
    target: j.target,
    stopLoss: j.stopLoss,
    status: j.status,
    isMock: j.isMock,
    followUps: j.followUps,
    date: j.date,
    name: j.name,
  };
  return {
    target_kind: "stock",
    target_ref: j.symbol.toUpperCase(),
    title: `${j.name} ${j.type} (${j.date})`,
    body: JSON.stringify(body),
    linked_trade_ids: j.tradeId ? [j.tradeId] : undefined,
    tags: [j.status, j.type, j.isMock ? "mock" : "live"],
  };
}

export function memoToJournal(m: Memo): LocalJournal | null {
  try {
    const parsed = JSON.parse(m.body) as SerializedBody;
    return {
      id: m.id,
      date: parsed.date,
      symbol: m.target_ref ?? "",
      name: parsed.name,
      type: parsed.type,
      reason: parsed.reason,
      target: parsed.target,
      stopLoss: parsed.stopLoss,
      status: parsed.status,
      tradeId: m.linked_trade_ids?.[0],
      isMock: parsed.isMock,
      followUps: parsed.followUps ?? [],
    };
  } catch {
    // not a journal memo (free-form note saved elsewhere)
    return null;
  }
}

export function useJournalsBackendSync(
  journals: LocalJournal[],
  setJournals: (updater: (prev: LocalJournal[]) => LocalJournal[]) => void,
) {
  const { user } = useAuth();
  const hydratedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!user) { hydratedFor.current = null; return; }
    if (hydratedFor.current === user.id) return;
    hydratedFor.current = user.id;
    (async () => {
      try {
        const res = await memosService.list({ target_kind: "stock", limit: 200 });
        const fromServer = res.items.map(memoToJournal).filter((x): x is LocalJournal => x !== null);
        if (fromServer.length === 0) return;
        setJournals((prev) => {
          const serverIds = new Set(fromServer.map((j) => j.id));
          const localOnly = prev.filter((j) => !serverIds.has(j.id));
          return [...fromServer, ...localOnly];
        });
      } catch { /* */ }
    })();
  }, [user, setJournals]);

  const upsert = async (j: LocalJournal) => {
    setJournals((prev) => {
      const exists = prev.some((x) => x.id === j.id);
      return exists ? prev.map((x) => (x.id === j.id ? j : x)) : [j, ...prev];
    });
    if (!user) return;
    try {
      // If id starts with a UUID-ish pattern, treat as existing memo to PATCH.
      const isServerId = /^[0-9a-f]{8}-/i.test(j.id);
      const memoPayload = journalToMemo(j);
      if (isServerId) {
        await memosService.update(j.id, {
          title: memoPayload.title,
          body: memoPayload.body,
          tags: memoPayload.tags,
          linked_trade_ids: memoPayload.linked_trade_ids,
        });
      } else {
        const saved = await memosService.create(memoPayload);
        const remapped = memoToJournal(saved);
        if (remapped) {
          setJournals((prev) => prev.map((x) => (x.id === j.id ? remapped : x)));
        }
      }
    } catch { /* */ }
  };

  const remove = async (id: string) => {
    setJournals((prev) => prev.filter((j) => j.id !== id));
    if (!user) return;
    try { await memosService.remove(id); } catch { /* */ }
  };

  return { upsert, remove };
}
