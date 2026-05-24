import { apiGet } from "@/lib/http";
import type { SectorData } from "@/types";
import { useAsync } from "@/features/_shared/useAsync";

export const sectorsService = {
  list: (market: "US" | "KR") =>
    apiGet<{ items: SectorData[] }>(`/sectors?market=${market}`),
};

export function useSectors(market: "US" | "KR") {
  return useAsync(
    () => sectorsService.list(market).then((r) => r.items),
    [market],
    [],
  );
}
