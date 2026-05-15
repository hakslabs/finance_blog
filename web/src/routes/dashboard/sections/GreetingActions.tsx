import type { PortfolioSummary } from "../../../fixtures/dashboard";
import styles from "./GreetingActions.module.css";

type Props = {
  summary: PortfolioSummary;
  onOpenAssets?: () => void;
  onOpenTodayPnl?: () => void;
  onOpenTotalReturn?: () => void;
};

export function GreetingActions({
  summary,
  onOpenAssets,
  onOpenTodayPnl,
  onOpenTotalReturn,
}: Props) {
  return (
    <div className={styles.assetSummary}>
      <button type="button" className={styles.kpi} onClick={onOpenAssets}>
        <span className={styles.label}>내 자산</span>
        <span className={styles.value}>{summary.totalAssets}</span>
      </button>
      <div className={styles.divider} />
      <button type="button" className={styles.kpi} onClick={onOpenTodayPnl}>
        <span className={styles.label}>오늘 손익</span>
        <span className={styles.valuePositive}>
          {summary.todayPnl} ({summary.todayPnlPercent})
        </span>
      </button>
      <div className={styles.divider} />
      <button type="button" className={styles.kpi} onClick={onOpenTotalReturn}>
        <span className={styles.label}>총 수익률</span>
        <span className={styles.valuePositive}>{summary.totalReturn}</span>
      </button>
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
