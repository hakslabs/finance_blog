import { useEffect, useState } from "react";
import {
  apiClient,
  type BreadthResponse,
  type EconomicEventsResponse,
  type FearGreedResponse,
} from "./api-client";

type Loadable<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error"; message: string };

function useFetch<T>(key: unknown, fetcher: () => Promise<T>): Loadable<T> {
  const [state, setState] = useState<Loadable<T>>({ status: "loading" });
  useEffect(() => {
    let cancelled = false;
    fetcher()
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "로딩 실패";
        setState({ status: "error", message });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state;
}

export function useFearGreed(): Loadable<FearGreedResponse> {
  return useFetch("fg", () => apiClient.getFearGreed());
}

export function useEconomicEvents(daysForward = 10): Loadable<EconomicEventsResponse> {
  return useFetch(`ev:${daysForward}`, () => apiClient.getEconomicEvents(daysForward));
}

export function useBreadth(market: "US" | "KR"): Loadable<BreadthResponse> {
  return useFetch(`b:${market}`, () => apiClient.getBreadth(market));
}
