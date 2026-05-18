import { useEffect, useState } from "react";
import { apiClient, type PortfolioSnapshotResponse } from "./api-client";
import { useAuth } from "./auth-state";

export type PortfolioSnapshotState =
  | { status: "signed-out" }
  | { status: "loading" }
  | { status: "ready"; data: PortfolioSnapshotResponse }
  | { status: "error"; message: string };

export function usePortfolioSnapshot(): PortfolioSnapshotState {
  const auth = useAuth();
  const [state, setState] = useState<PortfolioSnapshotState>({ status: "loading" });
  useEffect(() => {
    if (auth.status === "signed-out" || auth.status === "config-error") {
      setState({ status: "signed-out" });
      return;
    }
    if (auth.status !== "signed-in") return;
    let cancelled = false;
    setState({ status: "loading" });
    apiClient
      .getPortfolioSnapshot()
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "포트폴리오 스냅샷 실패";
        setState({ status: "error", message });
      });
    return () => {
      cancelled = true;
    };
  }, [auth.status]);
  return state;
}
