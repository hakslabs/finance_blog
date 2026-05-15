import type { PortfolioSummary } from "../../../fixtures/dashboard";
import styles from "./GreetingActions.module.css";

type Props = { summary: PortfolioSummary };

export function GreetingActions({ summary }: Props) {
  return (
    <div className={styles.assetSummary}>
      <div className={styles.kpi}>
        <span className={styles.label}>내 자산</span>
        <span className={styles.value}>{summary.totalAssets}</span>
      </div>
      <div className={styles.divider} />
      <div className={styles.kpi}>
        <span className={styles.label}>오늘 손익</span>
        <span className={styles.valuePositive}>
          {summary.todayPnl} ({summary.todayPnlPercent})
        </span>
      </div>
      <div className={styles.divider} />
      <div className={styles.kpi}>
        <span className={styles.label}>총 수익률</span>
        <span className={styles.valuePositive}>{summary.totalReturn}</span>
      </div>
    </div>
  );
}

export function GreetingMeta({
  currentTimeLabel,
  marketStatus,
}: {
  currentTimeLabel: string;
  marketStatus: {
    label: string;
    statusLabel: string;
    open: boolean;
  }[];
}) {
  const openMarket = marketStatus.find((market) => market.open);
  return (
    <>
      오늘의 투자 상황판 · {currentTimeLabel}{" "}
      {openMarket ? (
        <b className={styles.metaPositive}>● {openMarket.statusLabel}</b>
      ) : (
        <b className={styles.metaNeutral}>● 정규장 대기</b>
      )}{" "}
      <span className={styles.metaFaint}>
        / {marketStatus.map((market) => `${market.label} ${market.statusLabel}`).join(" · ")}
      </span>
    </>
  );
}
