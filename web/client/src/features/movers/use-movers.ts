import { useEffect, useState } from "react";
import { moversService } from "./service";
import type { MoversResponse } from "./types";

export function useMovers(params: { market?: "US" | "KR"; limit?: number } = {}) {
  const [data, setData] = useState<MoversResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const key = `${params.market ?? ""}|${params.limit ?? ""}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    moversService
      .list(params)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { data, loading, error };
}
