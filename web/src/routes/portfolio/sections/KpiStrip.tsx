import { KpiTile } from "../../../components/primitives/KpiTile";
import type { Portfolio } from "../../../lib/api-client";
import styles from "./KpiStrip.module.css";

function formatMoney(value: number, currency: string): string {
  const sign = currency === "KRW" ? "₩" : currency === "USD" ? "$" : "";
  const digits = currency === "KRW" ? 0 : 2;
  return `${sign}${value.toLocaleString("ko-KR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

export function KpiStrip({ portfolio }: { portfolio: Portfolio }) {
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
      value: formatMoney(totalCostBasis, portfolio.currency),
      detail: portfolio.currency,
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
