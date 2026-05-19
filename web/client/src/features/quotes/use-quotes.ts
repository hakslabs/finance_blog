import { useEffect, useState } from "react";
import { quotesService } from "./service";
import type { Quote, QuoteRange } from "./types";

export function useQuote(symbol: string | undefined, range: QuoteRange = "6mo") {
  const [data, setData] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;
    setLoading(true);
    quotesService
      .get(symbol, range)
      .then((q) => {
        if (!cancelled) {
          setData(q);
          setError(null);
        }
      })
      .catch((e: Error) => !cancelled && setError(e))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [symbol, range]);

  return { data, loading, error };
}
