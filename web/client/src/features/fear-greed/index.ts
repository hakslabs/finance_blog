import { apiGet } from "@/lib/http";
import type { FearGreedData } from "@/types";
import { useAsync } from "@/features/_shared/useAsync";
import { FEAR_GREED_US, FEAR_GREED_KR } from "@/services/mockData";

export const fearGreedService = {
  get: (market: "US" | "KR", days = 90) =>
    apiGet<FearGreedData>(
      `/sentiment/fear-greed?market=${market}&days=${days}`,
    ),
};

export function useFearGreed(market: "US" | "KR") {
  const fallback = market === "US" ? FEAR_GREED_US : FEAR_GREED_KR;
  return useAsync(
    () =>
      fearGreedService
        .get(market)
        .then((d) => (d.history.length ? d : fallback)),
    [market],
    fallback,
  );
}
