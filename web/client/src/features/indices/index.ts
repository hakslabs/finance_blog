import { apiGet } from "@/lib/http";
import type { MarketIndex } from "@/types";
import { useAsync } from "@/features/_shared/useAsync";

// Backend returns snake_case (`change_pct`) so the API type is kept
// separate from the camelCase MarketIndex consumed by the UI.
type BackendIndex = {
  symbol: string;
  name: string;
  value: number;
  change: number;
  change_pct: number;
  market: MarketIndex["market"];
  source: "live" | "db";
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
  list: async (): Promise<{
    items: MarketIndex[];
    updatedAt: string | null;
  }> => {
    const r = await apiGet<{ items: BackendIndex[]; updated_at?: string }>(
      `/market/indices`,
    );
    return { items: r.items.map(adapt), updatedAt: r.updated_at ?? null };
  },
};

// Single fetch returning {items, updatedAt}. Consumers access via
// `.data` like the other hooks, plus `.updatedAt` for the freshness hint.
// During loading/error `data` is null so pages render skeleton/empty states
// instead of silently mixing stale demo index numbers into market surfaces.
export function useIndices() {
  // Gentle 5-min auto-refresh + revalidate-on-focus. Yahoo-backed (free,
  // near-real-time) so the index strip reflects the current session without
  // minute-by-minute churn. Not a metered free-tier API.
  const r = useAsync(() => indicesService.list(), [], null, {
    refreshInterval: 300000,
  });
  const data = r.data?.items ?? null;
  const updatedAt = r.data?.updatedAt ?? null;
  return { ...r, data, updatedAt };
}
