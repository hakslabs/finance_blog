import { KpiStrip as KpiStripPrimitive, type KpiStripItem } from "../../../components/primitives/KpiStrip";
import type { Portfolio } from "../../../lib/api-client";
import { useCurrency, type Currency } from "../../../lib/currency";

export function KpiStrip({ portfolio }: { portfolio: Portfolio }) {
  const { currency, format } = useCurrency();
  const sourceCurrency: Currency = "USD";
  const totalCostBasis = portfolio.holdings.reduce(
    (sum, h) => sum + h.cost_basis,
    0,
  );
  const holdingCount = portfolio.holdings.length;
  const txCount = portfolio.transactions.length;
  const buyCount = portfolio.transactions.filter((t) => t.type === "buy").length;
  const sellCount = portfolio.transactions.filter((t) => t.type === "sell").length;

  const items: KpiStripItem[] = [
    {
      id: "kpi-cost-basis",
      label: "투자원금 (보유분)",
      value: format(totalCostBasis, sourceCurrency),
      detail: currency,
    },
    {
      id: "kpi-holdings",
      label: "보유 종목",
      value: `${holdingCount}개`,
    },
    {
      id: "kpi-transactions",
      label: "거래 내역",
      value: `${txCount}건`,
      detail: `매수 ${buyCount} · 매도 ${sellCount}`,
    },
  ];

  return <KpiStripPrimitive items={items} ariaLabel="포트폴리오 요약" />;
}
