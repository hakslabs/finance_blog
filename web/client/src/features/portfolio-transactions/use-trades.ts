/**
 * useTrades — MyPage TradesTab 등에서 사용하는 거래 내역 hook.
 *
 * 로그인 사용자: 서버(/portfolios/me/transactions)에서 fetch.
 * 비로그인: localStorage("financelab_trades")에 저장된 mock 데이터.
 *
 * UI 호환을 위해 기존 Trade 타입(한글 type, total/fee 포함)에 맞춰 매핑한다.
 * fee는 서버에 없으므로 0으로 표기하고 메모에 보존.
 */
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { portfolioTransactionsService, type Transaction, type TxType } from "./service";

export type TradeType = "매수" | "매도";

export interface Trade {
  id: string;
  date: string;            // YYYY-MM-DD
  symbol: string;
  name: string;
  type: TradeType;
  shares: number;
  price: number;
  total: number;
  fee: number;
  note: string;
  journalLinked: boolean;
}

const LS_KEY = "financelab_trades";

function loadLocal(): Trade[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveLocal(trades: Trade[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(trades)); } catch { /* ignore */ }
}

const TYPE_TO_TX: Record<TradeType, TxType> = { "매수": "buy", "매도": "sell" };
const TX_TO_TYPE: Partial<Record<TxType, TradeType>> = { buy: "매수", sell: "매도" };

function txToTrade(tx: Transaction): Trade | null {
  const t = TX_TO_TYPE[tx.type];
  if (!t) return null;  // dividend/deposit 은 거래내역 탭에 표시 안 함
  return {
    id: tx.id,
    date: tx.occurred_at,
    symbol: tx.symbol ?? "",
    name: tx.name ?? tx.symbol ?? "",
    type: t,
    shares: tx.quantity ?? 0,
    price: tx.price ?? 0,
    total: tx.amount,
    fee: 0,
    note: tx.note ?? "",
    journalLinked: false,
  };
}

export function useTrades(initial: Trade[] = []) {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>(() => {
    const local = loadLocal();
    return local.length ? local : initial;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => { saveLocal(trades); }, [trades]);

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const items = await portfolioTransactionsService.list();
      const mapped = items.map(txToTrade).filter((t): t is Trade => t !== null);
      setTrades(mapped);
    } catch { /* 로컬 유지 */ }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { void reload(); }, [reload]);

  const addTrade = useCallback(async (trade: Trade) => {
    // Optimistic
    setTrades(prev => [trade, ...prev]);
    if (!user) return;
    try {
      const created = await portfolioTransactionsService.create({
        symbol: trade.symbol,
        type: TYPE_TO_TX[trade.type],
        quantity: trade.shares,
        price: trade.price,
        amount: trade.total,
        occurred_at: trade.date,
        note: trade.note || undefined,
      });
      // 서버 id로 교체 (optimistic id 제거)
      setTrades(prev => [txToTrade(created)!, ...prev.filter(t => t.id !== trade.id)]);
    } catch (e) {
      setTrades(prev => prev.filter(t => t.id !== trade.id));
      throw e;
    }
  }, [user]);

  const removeTrade = useCallback(async (id: string) => {
    const prev = trades;
    setTrades(cur => cur.filter(t => t.id !== id));
    if (!user) return;
    try {
      await portfolioTransactionsService.remove(id);
    } catch (e) {
      setTrades(prev);
      throw e;
    }
  }, [trades, user]);

  return { trades, setTrades, addTrade, removeTrade, loading, reload };
}
