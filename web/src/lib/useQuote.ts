import { useEffect, useState } from "react";
import { apiClient, ApiError, type Quote, type QuoteRange } from "./api-client";
import { useAuth } from "./auth-state";

export type QuoteState =
  | { status: "signed-out" }
  | { status: "loading" }
  | { status: "ready"; quote: Quote }
  | { status: "empty" }
  | { status: "error"; message: string };

export function useQuote(symbol: string, range: QuoteRange = "6mo"): QuoteState {
  const auth = useAuth();
  const [state, setState] = useState<QuoteState>({ status: "loading" });

  useEffect(() => {
    if (auth.status !== "signed-in") {
      return undefined;
    }

    let cancelled = false;
    apiClient
      .getQuote(symbol, range)
      .then((quote) => {
        if (!cancelled) setState({ status: "ready", quote });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 503) {
          setState({ status: "empty" });
          return;
        }
        const message =
          error instanceof Error ? error.message : "시세를 불러오지 못했습니다.";
        setState({ status: "error", message });
      });
    return () => {
      cancelled = true;
    };
  }, [auth.status, symbol, range]);

  if (auth.status === "signed-out" || auth.status === "config-error") {
    return { status: "signed-out" };
  }
  if (auth.status === "loading") return { status: "loading" };

  return state;
}
