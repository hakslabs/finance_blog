import { useEffect, useState } from "react";
import { apiClient, type MoversResponse } from "./api-client";

export type MoversState =
  | { status: "loading" }
  | { status: "ready"; data: MoversResponse }
  | { status: "error"; message: string };

export function useMovers(market: "US" | "KR", limit = 6): MoversState {
  const [state, setState] = useState<MoversState>({ status: "loading" });
  const [key, setKey] = useState(`${market}:${limit}`);
  if (key !== `${market}:${limit}`) {
    setKey(`${market}:${limit}`);
    setState({ status: "loading" });
  }
  useEffect(() => {
    let cancelled = false;
    apiClient
      .getMovers(market, limit)
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "급등락 데이터 로딩 실패";
        setState({ status: "error", message });
      });
    return () => {
      cancelled = true;
    };
  }, [market, limit]);
  return state;
}
