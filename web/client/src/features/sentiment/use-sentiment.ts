import { useEffect, useState } from "react";
import { sentimentService } from "./service";
import type { FearGreedItem } from "./types";

export function useFearGreed() {
  const [data, setData] = useState<FearGreedItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    sentimentService
      .fearGreed()
      .then((rows) => {
        if (!cancelled) {
          setData(rows);
          setError(null);
        }
      })
      .catch((e: Error) => !cancelled && setError(e))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}
