import { apiGet } from "@/lib/http";
import { useAsync } from "@/features/_shared/useAsync";

export interface DataStatus {
  bars_latest_us: string | null;
  bars_latest_kr: string | null;
  news_latest: string | null;
  as_of: string;
}

export const marketService = {
  dataStatus: () => apiGet<DataStatus>(`/market/data-status`),
};

/**
 * Freshness of the on-screen market data — the latest trading day present in
 * the DB. Surfaced as a global "데이터 기준일" so users can see which session
 * the numbers reflect (free tiers are EOD/delayed → usually T-1/T-2).
 *
 * 5-min gentle poll + revalidate-on-focus (cheap DB-cached read).
 */
export function useDataStatus() {
  return useAsync(() => marketService.dataStatus(), [], null, {
    refreshInterval: 300000,
  });
}
