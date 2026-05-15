import { KpiTile } from "../../../components/primitives/KpiTile";
import type { Portfolio } from "../../../lib/api-client";
import { useCurrency, type Currency } from "../../../lib/currency";
import styles from "./KpiStrip.module.css";

export function KpiStrip({ portfolio }: { portfolio: Portfolio }) {
  const { currency, format } = useCurrency();

  // The portfolio API returns numeric values in USD. We treat them as USD and
  // convert via the active currency context.
  const sourceCurrency: Currency = "USD";
  const totalCostBasis = portfolio.holdings.reduce(
    (sum, h) => sum + h.cost_basis,
    0,
  );
  const holdingCount = portfolio.holdings.length;
  const txCount = portfolio.transactions.length;
  const buyCount = portfolio.transactions.filter((t) => t.type === "buy").length;
  const sellCount = portfolio.transactions.filter((t) => t.type === "sell").length;

  const items: Array<{ id: string; label: string; value: string; detail?: string }> = [
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

  return (
    <section className={styles.strip} aria-label="포트폴리오 요약">
      {items.map((item) => (
        <div key={item.id} className={styles.item}>
          <KpiTile label={item.label} value={item.value} detail={item.detail} />
        </div>
      ))}
    </section>
  );
}
