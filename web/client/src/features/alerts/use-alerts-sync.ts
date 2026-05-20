/**
 * useAlertsSync — 서버(/me/alerts)에서 알림 목록을 가져와 기존 UI 상태와 병합.
 *
 * MyPage AlertsTab 의 AlertItem 모델은 백엔드 alerts 와 1:1 매핑되지 않으므로
 * 서버 알림을 별도 항목으로 prepend 한다(중복 ID 방지). 쓰기 동기화는 차후로.
 */
import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { alertsService, type Alert } from "./service";

export interface AlertItemShape {
  id: string;
  symbol: string;
  name: string;
  type: string;       // "목표가 도달" 등
  condition: string;  // "≥ $1,000" 등
  status: string;     // "활성" 등
  created: string;
  journalId?: string;
}

const KIND_LABEL: Record<string, string> = {
  price: "목표가 도달",
  rsi: "RSI 알림",
  ma_cross: "이평선 교차",
  volume: "거래량 급증",
  macro: "매크로 알림",
  custom: "사용자 정의",
};
const OP_SYM: Record<string, string> = {
  gte: "≥",
  gt: ">",
  lte: "≤",
  lt: "<",
  eq: "=",
  cross_up: "↑",
  cross_down: "↓",
};

function alertToItem(a: Alert): AlertItemShape {
  return {
    id: a.id,
    symbol: a.instrument_id ?? "",  // 심볼은 instrument_id → symbol 룩업 필요(추후)
    name: "",
    type: KIND_LABEL[a.kind] ?? a.kind,
    condition: `${OP_SYM[a.operator] ?? a.operator} ${a.threshold.toLocaleString()}`,
    status: a.triggered_at ? "완료" : a.enabled ? "활성" : "비활성",
    created: (a.created_at ?? "").slice(0, 10),
  };
}

export function useAlertsSync<T extends AlertItemShape>(
  setItems: (updater: (prev: T[]) => T[]) => void,
) {
  const { user } = useAuth();
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!user) { hydratedRef.current = false; return; }
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    (async () => {
      try {
        const items = await alertsService.list();
        if (!items.length) return;
        setItems((prev) => {
          const ids = new Set(prev.map((p) => p.id));
          const fresh = items.filter((a) => !ids.has(a.id)).map(alertToItem) as unknown as T[];
          return [...fresh, ...prev];
        });
      } catch { /* ignore */ }
    })();
  }, [user, setItems]);
}
