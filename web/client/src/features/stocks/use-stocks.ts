import { useCallback, useEffect, useRef, useState } from "react";
import { useAsync } from "@/features/_shared/useAsync";
import { stocksService } from "./service";

/**
 * Live stocks list from the backend.
 * No mock fallback: callers should render skeleton/error/empty states
 * instead of silently mixing stale demo prices into chart surfaces.
 */
export function useStocks(market: "US" | "KR") {
  return useAsync(
    () => stocksService.list(market, 30).then((r) => r.items),
    [market],
  );
}

export function useStock(ticker: string | undefined) {
  return useAsync(
    () =>
      ticker
        ? stocksService.get(ticker)
        : Promise.reject(new Error("no ticker")),
    [ticker],
  );
}

export function useStockSearch(query: string, limit = 12) {
  const [data, setData] = useState<
    Awaited<ReturnType<typeof stocksService.search>>["items"] | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    const q = query.trim();
    const my = ++seq.current;
    if (!q) {
      setData([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      stocksService
        .search(q, limit, { signal: controller.signal })
        .then((r) => {
          if (my !== seq.current) return;
          setData(r.items);
          setLoading(false);
        })
        .catch((e) => {
          if (controller.signal.aborted) return;
          if (my !== seq.current) return;
          setData([]);
          setError(e instanceof Error ? e : new Error(String(e)));
          setLoading(false);
        });
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
      seq.current++;
    };
  }, [limit, query]);

  return { data, loading, error };
}

export function useStockNews(ticker: string | undefined, limit = 20) {
  return useAsync(
    () =>
      ticker
        ? stocksService.news(ticker, limit).then((r) => r.items)
        : Promise.reject(new Error("no ticker")),
    [ticker, limit],
  );
}

export function useStockConsensus(ticker: string | undefined) {
  return useAsync(
    () =>
      ticker
        ? stocksService.consensus(ticker)
        : Promise.reject(new Error("no ticker")),
    [ticker],
  );
}

export function useStockFilings(ticker: string | undefined, limit = 20) {
  return useAsync(
    () =>
      ticker
        ? stocksService.filings(ticker, limit).then((r) => r.items)
        : Promise.reject(new Error("no ticker")),
    [ticker, limit],
  );
}

export function useStockBars(ticker: string | undefined, days = 90) {
  type BarsResponse = Awaited<ReturnType<typeof stocksService.bars>>;
  type Bars = BarsResponse["items"];
  const [data, setData] = useState<Bars | null>(null);
  const [meta, setMeta] = useState<Omit<BarsResponse, "items"> | null>(null);
  const [dataKey, setDataKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const seq = useRef(0);
  const requestKey = ticker ? `${ticker}|${days}` : null;

  const run = useCallback(() => {
    const my = ++seq.current;
    const key = ticker ? `${ticker}|${days}` : null;
    const controller = new AbortController();
    setData(null);
    setMeta(null);
    setDataKey(key);
    setLoading(true);
    setError(null);
    if (!ticker) {
      setError(new Error("no ticker"));
      setLoading(false);
      return;
    }
    stocksService
      .bars(ticker, days, { signal: controller.signal })
      .then((r) => {
        if (my !== seq.current) return;
        setData(r.items);
        const { items: _items, ...nextMeta } = r;
        setMeta(nextMeta);
        setDataKey(key);
        setLoading(false);
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        if (my !== seq.current) return;
        setError(e instanceof Error ? e : new Error(String(e)));
        setData([]);
        setMeta(null);
        setDataKey(key);
        setLoading(false);
      });
    return () => {
      controller.abort();
    };
  }, [ticker, days]);

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
    meta: isCurrent ? meta : null,
    loading: loading || !isCurrent,
    error: isCurrent ? error : null,
    refetch: run,
  };
}
