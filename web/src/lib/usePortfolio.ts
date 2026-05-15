import { useEffect, useState } from "react";
import { apiClient, type Portfolio } from "./api-client";

export type PortfolioState =
  | { status: "loading" }
  | { status: "ready"; portfolio: Portfolio }
  | { status: "error"; message: string };

export function usePortfolio(): PortfolioState {
  const [state, setState] = useState<PortfolioState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    apiClient
      .getMyPortfolio()
      .then((response) => {
        if (!cancelled) setState({ status: "ready", portfolio: response.portfolio });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : "포트폴리오를 불러오지 못했습니다.";
        setState({ status: "error", message });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
