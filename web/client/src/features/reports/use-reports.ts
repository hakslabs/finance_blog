import { useEffect, useState } from "react";
import { reportsService } from "./service";
import type { ReportDetail, ReportSummary } from "./types";

export function useReportsList(params: { category?: string; limit?: number } = {}) {
  const [data, setData] = useState<ReportSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const key = `${params.category ?? ""}|${params.limit ?? ""}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    reportsService
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

export function useReportDetail(id: string | undefined) {
  const [data, setData] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    reportsService
      .detail(id)
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
  }, [id]);

  return { data, loading, error };
}
