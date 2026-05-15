import { PageContainer } from "../../components/layout/PageContainer";
import { ActionNotice } from "../../components/interaction/ActionNotice";
import { DetailPanel } from "../../components/interaction/DetailPanel";
import { Card } from "../../components/primitives/Card";
import { Skeleton } from "../../components/primitives/Skeleton";
import { usePortfolio } from "../../lib/usePortfolio";
import { useInteractionActions } from "../../lib/interaction/useInteractionActions";
import type { Portfolio, PortfolioHolding, PortfolioTransaction } from "../../lib/api-client";
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

function holdingDetail(row: PortfolioHolding) {
  return {
    id: `portfolio-holding-${row.exchange}-${row.symbol}`,
    eyebrow: "보유 종목",
    title: `${row.symbol} · ${row.name}`,
    meta: `${row.exchange} · ${row.currency}`,
    summary: "거래 원장 기반으로 계산한 현재 보유 상세입니다.",
    sections: [
      {
        title: "보유 값",
        body: "현재 포지션 원장 기준입니다.",
        items: [
          `수량: ${row.quantity}`,
          `평단가: ${row.average_cost}`,
          `투자원금: ${row.cost_basis}`,
        ],
      },
    ],
  };
}

function transactionDetail(row: PortfolioTransaction) {
  return {
    id: `portfolio-transaction-${row.id}`,
    eyebrow: "거래 내역",
    title: `${row.symbol ?? "현금"} · ${row.type}`,
    meta: row.occurred_at,
    summary: row.note || "거래 원장의 개별 기록입니다.",
    sections: [
      {
        title: "거래 값",
        body: "포지션 계산에 사용되는 원장 항목입니다.",
        items: [
          `수량: ${row.quantity ?? "—"}`,
          `단가: ${row.price ?? "—"}`,
          `금액: ${row.amount} ${row.currency}`,
        ],
      },
    ],
  };
}

function ReadyBody({
  portfolio,
  onOpenHolding,
  onOpenTransaction,
}: {
  portfolio: Portfolio;
  onOpenHolding: (row: PortfolioHolding) => void;
  onOpenTransaction: (row: PortfolioTransaction) => void;
}) {
  return (
    <>
      <KpiStrip portfolio={portfolio} />
      <div className={styles.grid}>
        <HoldingsTable holdings={portfolio.holdings} onOpenHolding={onOpenHolding} />
        <TransactionsTable transactions={portfolio.transactions} onOpenTransaction={onOpenTransaction} />
      </div>
    </>
  );
}

export function PortfolioPage() {
  const state = usePortfolio();
  const { detail, notice, handleAction, closeDetail } = useInteractionActions();
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
          <div className={styles.skeletonGrid} aria-hidden="true">
            <Skeleton variant="title" />
            <Skeleton />
            <Skeleton />
            <Skeleton variant="block" />
          </div>
        </Card>
      )}
      {state.status === "error" && (
        <Card title="포트폴리오">
          <p className={styles.statusBody}>
            포트폴리오를 불러오지 못했습니다. ({state.message})
          </p>
        </Card>
      )}
      {state.status === "ready" && (
        <ReadyBody
          portfolio={state.portfolio}
          onOpenHolding={(row) => handleAction({ type: "detail", detail: holdingDetail(row) })}
          onOpenTransaction={(row) => handleAction({ type: "detail", detail: transactionDetail(row) })}
        />
      )}
      <DetailPanel detail={detail} onClose={closeDetail} />
      <ActionNotice message={notice} />
    </PageContainer>
  );
}
