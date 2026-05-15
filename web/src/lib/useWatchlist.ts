import { useEffect, useState } from "react";
import { apiClient, type Watchlist } from "./api-client";

export type WatchlistState =
  | { status: "loading" }
  | { status: "ready"; watchlist: Watchlist }
  | { status: "error"; message: string };

export function useWatchlist(): WatchlistState {
  const [state, setState] = useState<WatchlistState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    apiClient
      .getMyWatchlist()
      .then((response) => {
        if (!cancelled) {
          setState({ status: "ready", watchlist: response.watchlist });
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : "관심종목을 불러오지 못했습니다.";
        setState({ status: "error", message });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
