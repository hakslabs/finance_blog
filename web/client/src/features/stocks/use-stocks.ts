import { useAsync } from "@/features/_shared/useAsync";
import { stocksService } from "./service";
import { US_STOCKS, KR_STOCKS } from "@/services/mockData";

/**
 * Live stocks list, overlayed onto the mock universe.
 *
 * Returns the mock array as fallback so pages render even when the backend
 * isn't reachable (build/preview).
 */
export function useStocks(market: "US" | "KR") {
  const fallback = market === "US" ? US_STOCKS : KR_STOCKS;
  return useAsync(
    () => stocksService.list(market, 100).then((r) => r.items.length ? r.items : fallback),
    [market],
    fallback,
  );
}

export function useStock(ticker: string | undefined) {
  return useAsync(
    () => (ticker ? stocksService.get(ticker) : Promise.reject(new Error("no ticker"))),
    [ticker],
  );
}
