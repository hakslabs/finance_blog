/**
 * Translation + sync between MyPage's local Trade (Korean enum) and the
 * backend Trade. Same shape as features/alerts/sync.ts.
 */
import { useEffect, useRef } from "react";
import { portfolioService } from "@/features/portfolio";
import { useAuth } from "@/contexts/AuthContext";
import type { Trade as BackendTrade } from "@/types";

export interface LocalTrade {
  id: string;
  date: string;
  symbol: string;
  name: string;
  type: "매수" | "매도";
  shares: number;
  price: number;
  total: number;
  fee: number;
  note: string;
  journalLinked: boolean;
}

export function localTradeToBackend(t: LocalTrade): Omit<BackendTrade, "id"> {
  return {
    ticker: t.symbol.toUpperCase(),
    name: t.name,
    type: t.type === "매수" ? "buy" : "sell",
    quantity: t.shares,
    price: t.price,
    date: t.date,
    fee: t.fee,
    note: t.note || undefined,
  };
}

export function backendTradeToLocal(t: BackendTrade): LocalTrade {
  return {
    id: t.id,
    date: t.date,
    symbol: t.ticker,
    name: t.name,
    type: t.type === "buy" ? "매수" : "매도",
    shares: t.quantity,
    price: t.price,
    total: t.quantity * t.price,
    fee: t.fee ?? 0,
    note: t.note ?? "",
    journalLinked: false,
  };
}

export function useTradesBackendSync(
  trades: LocalTrade[],
  setTrades: (updater: (prev: LocalTrade[]) => LocalTrade[]) => void,
) {
  const { user } = useAuth();
  const hydratedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      hydratedFor.current = null;
      return;
    }
    if (hydratedFor.current === user.id) return;
    hydratedFor.current = user.id;
    (async () => {
      try {
        const res = await portfolioService.trades();
        const fromServer = res.items.map(backendTradeToLocal);
        setTrades((prev) => {
          const serverIds = new Set(fromServer.map((t) => t.id));
          const localOnly = prev.filter((t) => !serverIds.has(t.id));
          return [...fromServer, ...localOnly];
        });
      } catch {
        /* offline */
      }
    })();
  }, [user, setTrades]);

  const add = async (t: LocalTrade) => {
    setTrades((prev) => [t, ...prev]);
    if (!user) return;
    try {
      const saved = await portfolioService.addTrade(localTradeToBackend(t));
      setTrades((prev) =>
        prev.map((x) => (x.id === t.id ? backendTradeToLocal(saved) : x)),
      );
    } catch {
      /* */
    }
  };

  const remove = async (id: string) => {
    setTrades((prev) => prev.filter((t) => t.id !== id));
    if (!user) return;
    try {
      await portfolioService.removeTrade(id);
    } catch {
      /* */
    }
  };

  return { add, remove };
}
