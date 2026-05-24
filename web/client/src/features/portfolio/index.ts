import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/http";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAsync } from "@/features/_shared/useAsync";
import { useAuth } from "@/contexts/AuthContext";
import type { PortfolioHolding, Trade } from "@/types";

interface BackendTransaction {
  id: string;
  symbol?: string | null;
  name?: string | null;
  exchange?: string | null;
  type: "buy" | "sell" | "dividend" | "deposit";
  quantity?: number | null;
  price?: number | null;
  amount: number;
  currency: string;
  note?: string | null;
  occurred_at: string;
}

function snapshotHoldingToPortfolioHolding(
  h: SnapshotHolding,
): PortfolioHolding {
  return {
    ticker: h.symbol,
    name: h.name,
    exchange: h.exchange,
    quantity: h.quantity,
    avgPrice: h.average_cost,
    currentPrice: h.last_price ?? h.average_cost,
    value: h.market_value ?? h.cost_basis,
    gainLoss: h.pnl ?? 0,
    gainLossPct: h.pnl_pct ?? 0,
    weight: h.weight_pct ?? 0,
    sector: "—",
    country: /^\d/.test(h.symbol) ? "KR" : "US",
  };
}

function backendTradeToTrade(t: BackendTransaction): Trade {
  return {
    id: t.id,
    ticker: t.symbol ?? "",
    name: t.name ?? t.symbol ?? "",
    type: t.type === "sell" ? "sell" : "buy",
    quantity: t.quantity ?? 0,
    price: t.price ?? 0,
    date: t.occurred_at.slice(0, 10),
    fee: 0,
    note: t.note ?? undefined,
  };
}

function tradeToBackendBody(t: Omit<Trade, "id">) {
  return {
    symbol: t.ticker,
    type: t.type,
    quantity: t.quantity,
    price: t.price,
    amount: t.quantity * t.price,
    currency: /^\d/.test(t.ticker) ? "KRW" : "USD",
    note: t.note,
    occurred_at: t.date,
  };
}

const PORTFOLIO_HISTORY_MIN_DAYS = 1;
const PORTFOLIO_HISTORY_MAX_DAYS = 1825;

function clampPortfolioHistoryDays(days: number): number {
  if (!Number.isFinite(days)) return PORTFOLIO_HISTORY_MAX_DAYS;
  return Math.min(
    PORTFOLIO_HISTORY_MAX_DAYS,
    Math.max(PORTFOLIO_HISTORY_MIN_DAYS, Math.round(days)),
  );
}

export const portfolioService = {
  snapshot: () => apiGet<PortfolioSnapshot>(`/portfolios/me/snapshot`),
  history: (days = PORTFOLIO_HISTORY_MAX_DAYS, init?: RequestInit) => {
    const safeDays = clampPortfolioHistoryDays(days);
    return apiGet<PortfolioHistory>(
      `/portfolios/me/history?days=${safeDays}`,
      init,
    );
  },
  analytics: (
    flowPeriod: "week" | "month" | "year" = "month",
    pnlPeriod: "day" | "week" | "month" | "year" = "month",
  ) =>
    apiGet<PortfolioAnalytics>(
      `/portfolios/me/analytics?flow_period=${flowPeriod}&pnl_period=${pnlPeriod}&flow_currency=KRW&pnl_currency=USD`,
    ),
  holdings: () =>
    portfolioService.snapshot().then((snapshot) => ({
      items: snapshot.holdings.map(snapshotHoldingToPortfolioHolding),
    })),
  trades: () =>
    apiGet<{ items: BackendTransaction[] }>(`/portfolios/me/transactions`).then(
      (r) => ({ items: r.items.map(backendTradeToTrade) }),
    ),
  addTrade: (body: Omit<Trade, "id">) =>
    apiPost<BackendTransaction>(
      `/portfolios/me/transactions`,
      tradeToBackendBody(body),
    ).then(backendTradeToTrade),
  updateTrade: (id: string, body: Partial<Omit<Trade, "id" | "ticker">>) =>
    apiPatch<BackendTransaction>(`/portfolios/me/transactions/${id}`, {
      quantity: body.quantity,
      price: body.price,
      amount:
        body.quantity != null && body.price != null
          ? body.quantity * body.price
          : undefined,
      note: body.note,
      occurred_at: body.date,
    }).then(backendTradeToTrade),
  removeTrade: (id: string) =>
    apiDelete<void>(`/portfolios/me/transactions/${id}`),
};

export interface SnapshotHolding {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  quantity: number;
  average_cost: number;
  cost_basis: number;
  last_price: number | null;
  market_value: number | null;
  today_change: number | null;
  today_pct: number | null;
  weight_pct: number | null;
  pnl: number | null;
  pnl_pct: number | null;
}

export interface PortfolioSnapshot {
  totals: {
    currency: string;
    total_value: number;
    total_cost: number;
    today_pnl: number;
    today_pct: number;
    total_return: number;
    total_return_pct: number;
  };
  composition: { label: string; percent: number; amount: number }[];
  top_holdings: SnapshotHolding[];
  holdings: SnapshotHolding[];
}

export interface PortfolioHistoryPoint {
  date: string;
  portfolio: number | null;
  cost: number | null;
}

export interface PortfolioHistoryHolding {
  symbol: string;
  requested_days: number;
  returned_count: number;
  from_date: string | null;
  to_date: string | null;
}

export interface PortfolioHistory {
  currency: string;
  requested_days: number;
  rows: PortfolioHistoryPoint[];
  holdings: PortfolioHistoryHolding[];
}

export interface InvestmentFlowPoint {
  date: string;
  label: string;
  value: number;
  netFlow: number;
}

export interface RealizedPnlPoint {
  date: string;
  label: string;
  pnl: number;
  cumPnl: number;
}

export interface PortfolioAnalytics {
  currency: string;
  flow_currency: string;
  pnl_currency: string;
  investment_flow: InvestmentFlowPoint[];
  realized_pnl: RealizedPnlPoint[];
  total_buy: number;
  total_sell: number;
  total_fee: number;
  total_realized_pnl: number;
}

export function usePortfolioSnapshot() {
  const { user } = useAuth();
  return useAsync(
    () =>
      user
        ? portfolioService.snapshot()
        : Promise.resolve({
            totals: {
              currency: "KRW",
              total_value: 0,
              total_cost: 0,
              today_pnl: 0,
              today_pct: 0,
              total_return: 0,
              total_return_pct: 0,
            },
            composition: [],
            top_holdings: [],
            holdings: [],
          } satisfies PortfolioSnapshot),
    [user?.id],
  );
}

export function usePortfolioAnalytics(
  flowPeriod: "week" | "month" | "year" = "month",
  pnlPeriod: "day" | "week" | "month" | "year" = "month",
) {
  const { user } = useAuth();
  return useAsync(
    () =>
      user
        ? portfolioService.analytics(flowPeriod, pnlPeriod)
        : Promise.resolve({
            currency: "KRW",
            flow_currency: "KRW",
            pnl_currency: "USD",
            investment_flow: [],
            realized_pnl: [],
            total_buy: 0,
            total_sell: 0,
            total_fee: 0,
            total_realized_pnl: 0,
          } satisfies PortfolioAnalytics),
    [user?.id, flowPeriod, pnlPeriod],
  );
}

export function usePortfolioHistory(days = 1825) {
  const { user } = useAuth();
  const safeDays = clampPortfolioHistoryDays(days);
  const [data, setData] = useState<PortfolioHistory | null>(null);
  const [dataKey, setDataKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(user));
  const [error, setError] = useState<Error | null>(null);
  const seq = useRef(0);
  const requestKey = `${user?.id ?? "guest"}|${safeDays}`;

  const run = useCallback(() => {
    const my = ++seq.current;
    const key = requestKey;
    const controller = new AbortController();
    setData(null);
    setDataKey(key);
    setLoading(Boolean(user));
    setError(null);
    if (!user) {
      setData({
        currency: "KRW",
        requested_days: safeDays,
        rows: [],
        holdings: [],
      });
      setDataKey(key);
      setLoading(false);
      return;
    }
    portfolioService
      .history(safeDays, { signal: controller.signal })
      .then((response) => {
        if (my !== seq.current) return;
        setData(response);
        setDataKey(key);
        setLoading(false);
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        if (my !== seq.current) return;
        setError(e instanceof Error ? e : new Error(String(e)));
        setData(null);
        setDataKey(key);
        setLoading(false);
      });
    return () => {
      controller.abort();
    };
  }, [requestKey, safeDays, user]);

  useEffect(() => {
    const abort = run();
    return () => {
      seq.current++;
      abort?.();
    };
  }, [run]);

  const isCurrent = dataKey === requestKey;
  return {
    data: isCurrent ? data : null,
    loading: loading || !isCurrent,
    error: isCurrent ? error : null,
    refetch: run,
  };
}

export function useHoldings() {
  const { user } = useAuth();
  return useAsync(
    () =>
      user
        ? portfolioService.holdings().then((r) => r.items)
        : Promise.resolve([]),
    [user?.id],
    [],
  );
}

export function useTrades() {
  const { user } = useAuth();
  return useAsync(
    () =>
      user
        ? portfolioService.trades().then((r) => r.items)
        : Promise.resolve([]),
    [user?.id],
    [],
  );
}
