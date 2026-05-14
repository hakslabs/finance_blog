import { PageContainer } from "../../components/layout/PageContainer";
import { KpiStrip } from "./sections/KpiStrip";
import { PerformanceSummary } from "./sections/PerformanceSummary";
import { HoldingsTable } from "./sections/HoldingsTable";
import { TransactionsTable } from "./sections/TransactionsTable";
import {
  PORTFOLIO_KPI,
  HOLDINGS,
  TRANSACTIONS,
  BENCHMARKS,
  PERFORMANCE_METRICS,
} from "../../fixtures/portfolio";
import styles from "./PortfolioPage.module.css";

export function PortfolioPage() {
  return (
    <PageContainer
      eyebrow="Portfolio"
      title="운용 / 포트폴리오"
      description={
        <span className={styles.meta}>
          최종 갱신 14:32 &middot; 자동동기화 켬
        </span>
      }
    >
      <KpiStrip kpis={PORTFOLIO_KPI} />

      <div className={styles.grid}>
        <HoldingsTable holdings={HOLDINGS} />
        <TransactionsTable transactions={TRANSACTIONS} />
      </div>

      <PerformanceSummary
        benchmarks={BENCHMARKS}
        metrics={PERFORMANCE_METRICS}
      />
    </PageContainer>
  );
}
