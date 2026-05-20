import { apiGet } from "@/lib/http";
import type { MarketIndex } from "@/types";
import { useAsync } from "@/features/_shared/useAsync";
import { MARKET_INDICES } from "@/services/mockData";

export const indicesService = {
  list: () => apiGet<{ items: MarketIndex[] }>(`/market/indices`),
};

export function useIndices() {
  return useAsync(
    () => indicesService.list().then((r) => (r.items.length ? r.items : MARKET_INDICES)),
    [],
    MARKET_INDICES,
  );
}
