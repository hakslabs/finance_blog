import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/http";
import { useAsync } from "@/features/_shared/useAsync";
import { useAuth } from "@/contexts/AuthContext";
import type { PortfolioHolding, Trade } from "@/types";

export const portfolioService = {
  holdings: () =>
    apiGet<{ items: PortfolioHolding[] }>(`/me/portfolio/holdings`),
  addHolding: (
    body: Pick<
      PortfolioHolding,
      | "ticker"
      | "name"
      | "exchange"
      | "quantity"
      | "avgPrice"
      | "sector"
      | "country"
    >,
  ) => apiPost<PortfolioHolding>(`/me/portfolio/holdings`, body),
  updateHolding: (
    ticker: string,
    body: Partial<Pick<PortfolioHolding, "quantity" | "avgPrice">>,
  ) =>
    apiPatch<PortfolioHolding>(
      `/me/portfolio/holdings/${encodeURIComponent(ticker)}`,
      body,
    ),
  removeHolding: (ticker: string) =>
    apiDelete<void>(`/me/portfolio/holdings/${encodeURIComponent(ticker)}`),

  trades: () => apiGet<{ items: Trade[] }>(`/me/portfolio/transactions`),
  addTrade: (body: Omit<Trade, "id">) =>
    apiPost<Trade>(`/me/portfolio/transactions`, body),
  updateTrade: (id: string, body: Partial<Omit<Trade, "id" | "ticker">>) =>
    apiPatch<Trade>(`/me/portfolio/transactions/${id}`, body),
  removeTrade: (id: string) =>
    apiDelete<void>(`/me/portfolio/transactions/${id}`),
};

export function useHoldings() {
  const { user } = useAuth();
  return useAsync(
    () =>
      user
        ? portfolioService.holdings().then((r) => r.items)
        : Promise.resolve([]),
    [user?.id],
    [],
  );
}

export function useTrades() {
  const { user } = useAuth();
  return useAsync(
    () =>
      user
        ? portfolioService.trades().then((r) => r.items)
        : Promise.resolve([]),
    [user?.id],
    [],
  );
}
