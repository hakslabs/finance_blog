import { useEffect, useState } from "react";
import {
  apiClient,
  type StockConsensusResponse,
  type StockFilingsResponse,
  type StockFinancialsResponse,
  type StockNewsResponse,
  type StockProfileResponse,
} from "./api-client";

type Loadable<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error"; message: string };

function useFetch<T>(
  key: unknown,
  fetcher: () => Promise<T>,
): Loadable<T> {
  const [state, setState] = useState<Loadable<T>>({ status: "loading" });
  const [currentKey, setCurrentKey] = useState(key);
  if (currentKey !== key) {
    setCurrentKey(key);
    setState({ status: "loading" });
  }
  useEffect(() => {
    let cancelled = false;
    fetcher()
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "데이터 로딩 실패";
        setState({ status: "error", message });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state;
}

export function useStockNews(symbol: string, days = 14): Loadable<StockNewsResponse> {
  return useFetch(`news:${symbol}:${days}`, () => apiClient.getStockNews(symbol, days));
}

export function useStockProfile(symbol: string): Loadable<StockProfileResponse> {
  return useFetch(`profile:${symbol}`, () => apiClient.getStockProfile(symbol));
}

export function useStockConsensus(symbol: string): Loadable<StockConsensusResponse> {
  return useFetch(`consensus:${symbol}`, () => apiClient.getStockConsensus(symbol));
}

export function useStockFilings(symbol: string, limit = 20): Loadable<StockFilingsResponse> {
  return useFetch(`filings:${symbol}:${limit}`, () => apiClient.getStockFilings(symbol, limit));
}

export function useStockFinancials(
  symbol: string,
  freq: "annual" | "quarterly" = "annual",
): Loadable<StockFinancialsResponse> {
  return useFetch(`fin:${symbol}:${freq}`, () => apiClient.getStockFinancials(symbol, freq));
}
