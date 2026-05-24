import { apiGet } from "@/lib/http";
import type { FearGreedData } from "@/types";
import { useAsync } from "@/features/_shared/useAsync";

function clampFearGreedDays(days: number): number {
  if (!Number.isFinite(days)) return 90;
  return Math.min(1825, Math.max(1, Math.floor(days)));
}

export const fearGreedService = {
  get: (market: "US" | "KR", days = 90) =>
    apiGet<FearGreedData>(
      `/sentiment/fear-greed?market=${market}&days=${clampFearGreedDays(days)}`,
    ),
};

export function useFearGreed(market: "US" | "KR", days = 90) {
  return useAsync(() => fearGreedService.get(market, days), [market, days]);
}
