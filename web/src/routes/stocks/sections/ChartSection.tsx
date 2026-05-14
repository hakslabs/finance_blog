import { Card } from "../../../components/primitives/Card";
import { ChartPlaceholder } from "../../../components/primitives/ChartPlaceholder";
import type { StockDetail } from "../../../fixtures/stocks";
import styles from "./ChartSection.module.css";

const PERIODS = [
  "1D",
  "1W",
  "1M",
  "3M",
  "6M",
  "1Y",
  "5Y",
  "ALL",
] as const;

const CHART_TYPES = ["캔들", "라인"] as const;
const INDICATORS = ["MA(20)", "MA(60)", "볼린저", "RSI", "MACD"] as const;

type ChartSectionProps = {
  detail: StockDetail;
};

export function ChartSection({ detail }: ChartSectionProps) {
  return (
    <Card title="풀 차트" eyebrow="MA · RSI · MACD · 볼린저 · 거래량">
      <div className={styles.sourceBar}>
        데이터: 미국주 Finnhub · 15분 지연 · 갱신 14:32
      </div>

      <div className={styles.periodGroup}>
        {PERIODS.map((p, i) => (
          <span
            key={p}
            className={`${styles.periodPill} ${
              i === 5 ? styles.periodActive : ""
            }`}
          >
            {p}
          </span>
        ))}
        <span className={styles.divider} aria-hidden="true" />
        {CHART_TYPES.map((t, i) => (
          <span
            key={t}
            className={`${styles.periodPill} ${
              i === 0 ? styles.periodActive : ""
            }`}
          >
            {t}
          </span>
        ))}
        <span className={styles.divider} aria-hidden="true" />
        {INDICATORS.map((ind) => (
          <span key={ind} className={styles.periodPill}>
            {ind}
          </span>
        ))}
      </div>

      <ChartPlaceholder label={`${detail.symbol} 메인 차트 (캔들)`} height={300} />

      <div className={styles.subPanel}>
        <div className={styles.subPanelHeader}>
          <span>Volume</span>
        </div>
        <ChartPlaceholder label="거래량 차트" height={50} />
      </div>

      <div className={styles.subPanel}>
        <div className={styles.subPanelHeader}>
          <span>RSI(14)</span>
          <span className={`${styles.subPanelValue} ${styles.subNeutral}`}>
            58.6 · 중립
          </span>
        </div>
        <ChartPlaceholder label="RSI(14) 지표" height={50} />
      </div>

      <div className={styles.subPanel}>
        <div className={styles.subPanelHeader}>
          <span>MACD (12,26,9)</span>
          <span className={`${styles.subPanelValue} ${styles.subPositive}`}>
            MACD 0.42 · Signal 0.28
          </span>
        </div>
        <ChartPlaceholder label="MACD 지표" height={50} />
      </div>
    </Card>
  );
}
