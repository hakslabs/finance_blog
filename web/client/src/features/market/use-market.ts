import { useEffect, useState } from "react";
import { marketService } from "./service";
import type { BreadthResponse } from "./types";

export function useBreadth(market: "US" | "KR" = "US") {
  const [data, setData] = useState<BreadthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    marketService
      .breadth(market)
      .then((r) => {
        if (!cancelled) {
          setData(r);
          setError(null);
        }
      })
      .catch((e: Error) => !cancelled && setError(e))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [market]);

  return { data, loading, error };
}
