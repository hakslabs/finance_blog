/**
 * Translation + sync layer between MyPage's local AlertItem (Korean enum)
 * and backend Alert (English enum). Keeps the page UI unchanged while
 * persisting through `/me/alerts`.
 */
import { useEffect, useRef } from "react";
import { alertsService, type Alert } from "@/features/alerts";
import { useAuth } from "@/contexts/AuthContext";

export type LocalAlertType = "목표가 도달" | "손절 라인" | "거래량 급증" | "뉴스 알림";
export type LocalAlertStatus = "활성" | "완료" | "비활성";

export interface LocalAlertItem {
  id: string;
  symbol: string;
  name: string;
  type: LocalAlertType;
  condition: string;
  status: LocalAlertStatus;
  created: string;
  journalId?: string;
}

const TYPE_KR_TO_EN: Record<LocalAlertType, Alert["alert_type"]> = {
  "목표가 도달": "target",
  "손절 라인": "stoploss",
  "거래량 급증": "volume",
  "뉴스 알림": "news",
};

const TYPE_EN_TO_KR: Record<Alert["alert_type"], LocalAlertType> = {
  target: "목표가 도달",
  stoploss: "손절 라인",
  volume: "거래량 급증",
  news: "뉴스 알림",
  earnings: "뉴스 알림", // map earnings to a known UI type
};

function parseThreshold(condition: string): number {
  // strip non-numerics; "≥ $189.30" → 189.30, "₩78,400" → 78400
  const cleaned = condition.replace(/[^\d.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function localAlertToBackend(item: LocalAlertItem): Parameters<typeof alertsService.create>[0] {
  return {
    symbol: item.symbol.toUpperCase(),
    alert_type: TYPE_KR_TO_EN[item.type],
    condition: item.condition,
    target_value: parseThreshold(item.condition),
    is_active: item.status === "활성",
  };
}

export function backendAlertToLocal(a: Alert): LocalAlertItem {
  return {
    id: a.id,
    symbol: a.symbol,
    name: a.symbol,
    type: TYPE_EN_TO_KR[a.alert_type] ?? "뉴스 알림",
    condition: a.condition,
    status: a.triggered_at ? "완료" : a.is_active ? "활성" : "비활성",
    created: (a.created_at ?? "").slice(0, 10),
  };
}

/**
 * Wraps a local [alerts, setAlerts] tuple so:
 *  - on user login, server alerts are merged into local state (server wins
 *    for matching IDs)
 *  - calling `add` / `remove` updates local state AND posts to backend
 *
 * Intended for MyPage AlertsTab without rewriting the entire tab.
 */
export function useAlertsBackendSync(
  alerts: LocalAlertItem[],
  setAlerts: (updater: (prev: LocalAlertItem[]) => LocalAlertItem[]) => void,
) {
  const { user } = useAuth();
  const hydratedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!user) { hydratedFor.current = null; return; }
    if (hydratedFor.current === user.id) return;
    hydratedFor.current = user.id;
    (async () => {
      try {
        const res = await alertsService.list();
        const fromServer = res.items.map(backendAlertToLocal);
        setAlerts((prev) => {
          // Replace items whose id is now from server; keep purely-local
          // items at the top (so user-added-while-anonymous survive).
          const serverIds = new Set(fromServer.map((a) => a.id));
          const localOnly = prev.filter((a) => !serverIds.has(a.id));
          return [...fromServer, ...localOnly];
        });
      } catch { /* offline */ }
    })();
  }, [user, setAlerts]);

  const add = async (item: LocalAlertItem) => {
    setAlerts((prev) => [item, ...prev]);
    if (!user) return;
    try {
      const saved = await alertsService.create(localAlertToBackend(item));
      // replace synthetic local id with server id
      setAlerts((prev) => prev.map((a) => (a.id === item.id ? backendAlertToLocal(saved) : a)));
    } catch { /* keep local-only */ }
  };

  const remove = async (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    if (!user) return;
    try { await alertsService.remove(id); } catch { /* */ }
  };

  return { add, remove };
}
