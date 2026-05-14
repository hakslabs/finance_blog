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
  date,
  day,
  time,
  nyseOpensIn,
}: {
  date: string;
  day: string;
  time: string;
  nyseOpensIn: string;
}) {
  return (
    <>
      오늘의 투자 상황판 · {date} {day} {time}{" "}
      <b className={styles.metaPositive}>● KRX 개장 중</b>{" "}
      <span className={styles.metaFaint}>/ NYSE 개장까지 {nyseOpensIn}</span>
    </>
  );
}
