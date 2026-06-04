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
 *
 * Real-time polling (`options.refreshInterval`):
 *  - When set (ms > 0), the hook re-fetches on that cadence so dashboards
 *    stay live without a manual reload.
 *  - Polls are SILENT: they never flip `loading` back to `true` and a
 *    transient poll failure is swallowed (the last good `data` stays on
 *    screen) — so a panel never flickers to a skeleton/error every tick.
 *  - Polling PAUSES while the tab is hidden (`document.hidden`) to avoid
 *    burning requests/quota in the background, and immediately REVALIDATES
 *    when the tab becomes visible or the window regains focus.
 *
 * Free-tier note: only point a `refreshInterval` at endpoints that read
 * from the Supabase DB cache (or a free/unmetered source like Yahoo). Do
 * NOT poll endpoints that call a metered free-tier API per request
 * (AlphaVantage 25/day, Polygon 5/min, Finnhub per-symbol) — those are
 * refreshed by the scheduled cron ingest, not by the browser.
 */
import { useCallback, useEffect, useRef, useState } from "react";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export interface AsyncOptions {
  /** Auto-refresh cadence in ms. 0/undefined disables polling. */
  refreshInterval?: number;
}

export function useAsync<T>(
  fetcher: () => Promise<T>,
  deps: ReadonlyArray<unknown> = [],
  fallback: T | null = null,
  options: AsyncOptions = {},
): AsyncState<T> {
  // Start with null — pages key their skeleton off `loading`, not off
  // the presence of a fallback array.
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const seq = useRef(0);
  const refreshInterval = options.refreshInterval ?? 0;

  const run = useCallback((silent = false) => {
    const my = ++seq.current;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    fetcher()
      .then((d) => {
        if (my !== seq.current) return;
        setData(d);
        setLoading(false);
        setError(null);
      })
      .catch((e) => {
        if (my !== seq.current) return;
        // A background poll that fails must not disturb the screen: keep
        // the last good data and error state, just wait for the next tick.
        if (silent) return;
        setError(e instanceof Error ? e : new Error(String(e)));
        setLoading(false);
        if (fallback !== null) setData(fallback);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Always call the latest `run` from the interval without re-arming it
  // every render.
  const runRef = useRef(run);
  runRef.current = run;

  // Initial fetch + re-fetch on dep change.
  useEffect(() => {
    run();
    return () => {
      seq.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Polling + revalidate-on-visible.
  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) return;
    if (typeof window === "undefined") return;

    const isHidden = () =>
      typeof document !== "undefined" && document.hidden === true;

    const id = window.setInterval(() => {
      if (!isHidden()) runRef.current(true);
    }, refreshInterval);

    const revalidate = () => {
      if (!isHidden()) runRef.current(true);
    };
    document.addEventListener("visibilitychange", revalidate);
    window.addEventListener("focus", revalidate);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", revalidate);
      window.removeEventListener("focus", revalidate);
    };
  }, [refreshInterval]);

  // Expose a stable, always-full refetch (ignores any event arg a caller
  // might pass via onClick, which would otherwise be read as `silent`).
  const refetch = useCallback(() => run(false), [run]);

  return { data, loading, error, refetch };
}
