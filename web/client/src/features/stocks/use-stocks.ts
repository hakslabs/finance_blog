import { useEffect, useState } from "react";
import { stocksService } from "./service";
import type {
  ConsensusResponse,
  NextEarningResponse,
  ProfileResponse,
  StockHoldersResponse,
} from "./types";

type Loadable<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
};

function useEndpoint<T>(
  loader: () => Promise<T>,
  symbol: string | undefined,
): Loadable<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;
    setLoading(true);
    loader()
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setError(null);
        }
      })
      .catch((e: Error) => !cancelled && setError(e))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  return { data, loading, error };
}

export function useStockProfile(symbol: string | undefined): Loadable<ProfileResponse> {
  return useEndpoint(() => stocksService.profile(symbol!), symbol);
}
export function useStockConsensus(symbol: string | undefined): Loadable<ConsensusResponse> {
  return useEndpoint(() => stocksService.consensus(symbol!), symbol);
}
export function useStockHolders(symbol: string | undefined): Loadable<StockHoldersResponse> {
  return useEndpoint(() => stocksService.holders(symbol!), symbol);
}
export function useStockNextEarning(symbol: string | undefined): Loadable<NextEarningResponse> {
  return useEndpoint(() => stocksService.nextEarning(symbol!), symbol);
}
