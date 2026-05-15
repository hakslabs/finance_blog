import { PageContainer } from "../../components/layout/PageContainer";
import { Card } from "../../components/primitives/Card";
import { usePortfolio } from "../../lib/usePortfolio";
import type { Portfolio } from "../../lib/api-client";
import { HoldingsTable } from "./sections/HoldingsTable";
import { KpiStrip } from "./sections/KpiStrip";
import { TransactionsTable } from "./sections/TransactionsTable";
import styles from "./PortfolioPage.module.css";

function formatUpdatedAt(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ReadyBody({ portfolio }: { portfolio: Portfolio }) {
  return (
    <>
      <KpiStrip portfolio={portfolio} />
      <div className={styles.grid}>
        <HoldingsTable holdings={portfolio.holdings} />
        <TransactionsTable transactions={portfolio.transactions} />
      </div>
    </>
  );
}

export function PortfolioPage() {
  const state = usePortfolio();
  const description =
    state.status === "ready" ? (
      <span className={styles.meta}>
        최종 갱신 {formatUpdatedAt(state.portfolio.updated_at)} &middot; 통화{" "}
        {state.portfolio.currency}
      </span>
    ) : (
      <span className={styles.meta}>최종 갱신 —</span>
    );

  return (
    <PageContainer eyebrow="Portfolio" title="운용 / 포트폴리오" description={description}>
      {state.status === "loading" && (
        <Card title="포트폴리오">
          <p className={styles.statusBody}>불러오는 중…</p>
        </Card>
      )}
      {state.status === "error" && (
        <Card title="포트폴리오">
          <p className={styles.statusBody}>
            포트폴리오를 불러오지 못했습니다. ({state.message})
          </p>
        </Card>
      )}
      {state.status === "ready" && <ReadyBody portfolio={state.portfolio} />}
    </PageContainer>
  );
}
