import { apiGet } from "@/lib/http";
import type { MarketIndex } from "@/types";
import { useAsync } from "@/features/_shared/useAsync";
import { MARKET_INDICES } from "@/services/mockData";

// Backend returns snake_case (`change_pct`) so the API type is kept
// separate from the camelCase MarketIndex consumed by the UI.
type BackendIndex = {
  symbol: string;
  name: string;
  value: number;
  change: number;
  change_pct: number;
  market: MarketIndex["market"];
  source: "live" | "mock";
};

function adapt(b: BackendIndex): MarketIndex {
  return {
    symbol: b.symbol,
    name: b.name,
    value: b.value,
    change: b.change,
    changePct: b.change_pct,
    market: b.market,
    source: b.source,
    trend: b.change > 0 ? "up" : b.change < 0 ? "down" : "flat",
  };
}

export const indicesService = {
  list: async (): Promise<{ items: MarketIndex[] }> => {
    const r = await apiGet<{ items: BackendIndex[] }>(`/market/indices`);
    return { items: r.items.map(adapt) };
  },
};

export function useIndices() {
  return useAsync(
    () => indicesService.list().then((r) => (r.items.length ? r.items : (MARKET_INDICES as MarketIndex[]))),
    [],
    MARKET_INDICES as MarketIndex[],
  );
}
