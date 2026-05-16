import { useEffect, useState } from "react";
import { apiClient, ApiError, type Master } from "./api-client";

export type MasterState =
  | { status: "loading" }
  | { status: "ready"; master: Master }
  | { status: "not-found" }
  | { status: "error"; message: string };

export function useMaster(slug: string | undefined): MasterState {
  const [state, setState] = useState<MasterState>(
    slug ? { status: "loading" } : { status: "not-found" },
  );

  useEffect(() => {
    if (!slug) {
      return;
    }
    let cancelled = false;
    apiClient
      .getMaster(slug)
      .then((res) => {
        if (!cancelled) setState({ status: "ready", master: res.master });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setState({ status: "not-found" });
          return;
        }
        const message = err instanceof Error ? err.message : "거장 정보를 불러오지 못했습니다.";
        setState({ status: "error", message });
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return state;
}
