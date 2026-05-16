import { useEffect, useState } from "react";
import { apiClient, type MacroIndicatorsResponse } from "./api-client";

export type MacrosState =
  | { status: "loading" }
  | { status: "ready"; data: MacroIndicatorsResponse }
  | { status: "error"; message: string };

export function useMacroIndicators(): MacrosState {
  const [state, setState] = useState<MacrosState>({ status: "loading" });
  useEffect(() => {
    let cancelled = false;
    apiClient
      .getMacroIndicators()
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "매크로 로딩 실패";
        setState({ status: "error", message });
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}
