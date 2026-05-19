import { useEffect, useState } from "react";
import { noticesService } from "./service";
import type { Notice } from "./types";

export function useNotices() {
  const [data, setData] = useState<Notice[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    noticesService
      .list()
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
