import { useEffect, useState } from "react";
import { apiClient, type MasterListResponse } from "./api-client";

export type MastersState =
  | { status: "loading" }
  | { status: "ready"; data: MasterListResponse }
  | { status: "error"; message: string };

export function useMasters(): MastersState {
  const [state, setState] = useState<MastersState>({ status: "loading" });
  useEffect(() => {
    let cancelled = false;
    apiClient
      .listMasters()
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "거장 목록 로딩 실패";
        setState({ status: "error", message });
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}
