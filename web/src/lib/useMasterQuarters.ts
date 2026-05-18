import { useEffect, useState } from "react";
import { apiClient, type MasterQuartersResponse } from "./api-client";

export type MasterQuartersState =
  | { status: "loading" }
  | { status: "ready"; data: MasterQuartersResponse }
  | { status: "error"; message: string };

export function useMasterQuarters(slug: string | undefined): MasterQuartersState {
  const [state, setState] = useState<MasterQuartersState>({ status: "loading" });
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    apiClient.getMasterQuarterChanges(slug)
      .then((data) => { if (!cancelled) setState({ status: "ready", data }); })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "분기 변화 로딩 실패";
        setState({ status: "error", message });
      });
    return () => { cancelled = true; };
  }, [slug]);
  return state;
}
