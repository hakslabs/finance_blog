import { useEffect, useState } from "react";
import { newsService } from "./service";
import type { NewsItem } from "./types";

export function useNewsList(params: { limit?: number; symbol?: string } = {}) {
  const [data, setData] = useState<NewsItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const key = `${params.limit ?? ""}|${params.symbol ?? ""}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    newsService
      .list(params)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { data, loading, error };
}
