import { useEffect, useState } from "react";
import { mastersService } from "./service";
import type {
  MasterDetail,
  MasterHoldingsResponse,
  MasterSummary,
} from "./types";

type Loadable<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
};

function useFetched<T>(load: () => Promise<T>, deps: unknown[]): Loadable<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load()
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setError(null);
        }
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}

export function useMastersList(): Loadable<MasterSummary[]> {
  return useFetched(() => mastersService.list(), []);
}

export function useMasterDetail(
  slug: string | undefined,
): Loadable<MasterDetail> {
  return useFetched(
    () =>
      slug
        ? mastersService.detail(slug)
        : Promise.reject(new Error("slug required")),
    [slug],
  );
}

export function useMasterHoldings(
  slug: string | undefined,
  limit = 30,
): Loadable<MasterHoldingsResponse> {
  return useFetched(
    () =>
      slug
        ? mastersService.holdings(slug, limit)
        : Promise.reject(new Error("slug required")),
    [slug, limit],
  );
}
