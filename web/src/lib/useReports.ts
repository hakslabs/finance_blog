import { useEffect, useState } from "react";
import { apiClient, type ReportListResponse } from "./api-client";

export type ReportsState =
  | { status: "loading" }
  | { status: "ready"; data: ReportListResponse }
  | { status: "error"; message: string };

export function useReports(limit = 50): ReportsState {
  const [state, setState] = useState<ReportsState>({ status: "loading" });
  useEffect(() => {
    let cancelled = false;
    apiClient
      .listReports(limit)
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "리포트 로딩 실패";
        setState({ status: "error", message });
      });
    return () => {
      cancelled = true;
    };
  }, [limit]);
  return state;
}
