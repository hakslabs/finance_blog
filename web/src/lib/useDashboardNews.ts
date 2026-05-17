import { useEffect, useState } from "react";
import { apiClient, type DashNewsResponse } from "./api-client";

export type DashNewsState =
  | { status: "loading" }
  | { status: "ready"; data: DashNewsResponse }
  | { status: "error"; message: string };

export function useDashboardNews(limit = 8): DashNewsState {
  const [state, setState] = useState<DashNewsState>({ status: "loading" });
  useEffect(() => {
    let cancelled = false;
    apiClient
      .getDashboardNews(limit)
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "뉴스 로딩 실패";
        setState({ status: "error", message });
      });
    return () => {
      cancelled = true;
    };
  }, [limit]);
  return state;
}
