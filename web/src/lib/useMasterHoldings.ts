import { useEffect, useState } from "react";
import { apiClient, type MasterHoldingsResponse } from "./api-client";

export type MasterHoldingsState =
  | { status: "loading" }
  | { status: "ready"; data: MasterHoldingsResponse }
  | { status: "error"; message: string };

export function useMasterHoldings(slug: string | undefined): MasterHoldingsState {
  const [state, setState] = useState<MasterHoldingsState>(
    slug ? { status: "loading" } : { status: "ready", data: { slug: "", period_end: null, filed_at: null, holdings: [] } },
  );

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    apiClient
      .getMasterHoldings(slug)
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "보유 종목 로딩 실패";
        setState({ status: "error", message });
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return state;
}
