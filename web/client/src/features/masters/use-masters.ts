import { useEffect, useState } from "react";
import { mastersService } from "./service";
import type { MasterDetail, MasterSummary } from "./types";

type Loadable<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
};

export function useMastersList(): Loadable<MasterSummary[]> {
  const [data, setData] = useState<MasterSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    mastersService
      .list()
      .then((rows) => {
        if (!cancelled) {
          setData(rows);
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
  }, []);

  return { data, loading, error };
}

export function useMasterDetail(slug: string | undefined): Loadable<MasterDetail> {
  const [data, setData] = useState<MasterDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    mastersService
      .detail(slug)
      .then((m) => {
        if (!cancelled) {
          setData(m);
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
  }, [slug]);

  return { data, loading, error };
}
