import { useEffect, useState } from "react";
import { apiClient, type Watchlist } from "./api-client";
import { useAuth } from "./auth-state";

export type WatchlistState =
  | { status: "signed-out" }
  | { status: "config-error" }
  | { status: "loading" }
  | { status: "ready"; watchlist: Watchlist }
  | { status: "error"; message: string };

type RemoteWatchlistState =
  | { status: "loading" }
  | { status: "ready"; watchlist: Watchlist }
  | { status: "error"; message: string };

export function useWatchlist(): WatchlistState {
  const auth = useAuth();
  const [state, setState] = useState<RemoteWatchlistState>({ status: "loading" });

  useEffect(() => {
    if (auth.status !== "signed-in") {
      return undefined;
    }

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
  }, [auth.status]);

  if (auth.status === "config-error") return { status: "config-error" };
  if (auth.status === "signed-out") return { status: "signed-out" };
  if (auth.status === "loading") return { status: "loading" };

  return state;
}
