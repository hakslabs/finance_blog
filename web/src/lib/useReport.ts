import { useEffect, useState } from "react";
import { apiClient, ApiError, type Report } from "./api-client";

export type ReportState =
  | { status: "loading" }
  | { status: "ready"; report: Report }
  | { status: "not-found" }
  | { status: "error"; message: string };

export function useReport(id: string | undefined): ReportState {
  const [state, setState] = useState<ReportState>(
    id ? { status: "loading" } : { status: "not-found" },
  );

  useEffect(() => {
    if (!id) {
      return;
    }
    let cancelled = false;
    apiClient
      .getReport(id)
      .then((res) => {
        if (!cancelled) setState({ status: "ready", report: res.report });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setState({ status: "not-found" });
          return;
        }
        const message = err instanceof Error ? err.message : "리포트를 불러오지 못했습니다.";
        setState({ status: "error", message });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return state;
}
