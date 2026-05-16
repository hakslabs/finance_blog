import { useEffect, useState } from "react";
import { apiClient, ApiError, type Quote, type QuoteRange } from "./api-client";

export type QuoteState =
  | { status: "loading" }
  | { status: "ready"; quote: Quote }
  | { status: "empty" }
  | { status: "error"; message: string };

// Quotes are public-read; no auth gate. The page should render a chart
// for an anonymous visitor too.
export function useQuote(symbol: string, range: QuoteRange = "6mo"): QuoteState {
  const [state, setState] = useState<QuoteState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
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
  }, [symbol, range]);

  return state;
}
