/**
 * Tiny SWR-ish hook: { data, loading, error, refetch } from an async fn.
 *
 * Re-fetches when `deps` change. Cancels stale fetches by ignoring late
 * resolutions. Falls back to `fallback` on error so pages keep rendering.
 */
import { useCallback, useEffect, useRef, useState } from "react";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useAsync<T>(
  fetcher: () => Promise<T>,
  deps: ReadonlyArray<unknown> = [],
  fallback: T | null = null,
): AsyncState<T> {
  const [data, setData] = useState<T | null>(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const seq = useRef(0);

  const run = useCallback(() => {
    const my = ++seq.current;
    setLoading(true);
    setError(null);
    fetcher()
      .then((d) => {
        if (my !== seq.current) return;
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        if (my !== seq.current) return;
        setError(e instanceof Error ? e : new Error(String(e)));
        setLoading(false);
        if (fallback !== null) setData(fallback);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
    return () => { seq.current++; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refetch: run };
}
