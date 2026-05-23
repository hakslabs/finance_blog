import { apiGet } from "@/lib/http";
import type { SectorData } from "@/types";
import { useAsync } from "@/features/_shared/useAsync";
import { US_SECTORS, KR_SECTORS } from "@/services/mockData";

export const sectorsService = {
  list: (market: "US" | "KR") =>
    apiGet<{ items: SectorData[] }>(`/sectors?market=${market}`),
};

export function useSectors(market: "US" | "KR") {
  const fallback = market === "US" ? US_SECTORS : KR_SECTORS;
  return useAsync(
    () =>
      sectorsService
        .list(market)
        .then((r) => (r.items.length ? r.items : fallback)),
    [market],
    fallback,
  );
}
