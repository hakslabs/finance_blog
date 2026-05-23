/**
 * Tiny SWR-ish hook: { data, loading, error, refetch } from an async fn.
 *
 * Re-fetches when `deps` change. Cancels stale fetches by ignoring late
 * resolutions.
 *
 * Loading semantics:
 *  - During the FIRST in-flight request, `data` stays `null`.
 *    Consumers should branch on `loading` to render a skeleton — they
 *    should NOT fall back to mock arrays during initial loading,
 *    because that flashes outdated demo numbers before the real
 *    values arrive.
 *  - On error, `data` switches to `fallback` (if provided) so pages
 *    keep rendering with the safest available value.
 *  - On dep change after the first load, the previous `data` stays
 *    visible until the new fetch resolves (smooth re-fetch).
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
  // Start with null — pages key their skeleton off `loading`, not off
  // the presence of a fallback array.
  const [data, setData] = useState<T | null>(null);
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
    return () => {
      seq.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refetch: run };
}
