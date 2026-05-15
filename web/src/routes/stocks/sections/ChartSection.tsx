import { Card } from "../../../components/primitives/Card";
import { ChartPlaceholder } from "../../../components/primitives/ChartPlaceholder";
import { PriceChart } from "../../../components/primitives/PriceChart";
import type { StockDetail } from "../../../fixtures/stocks";
import { useQuote } from "../../../lib/useQuote";
import type { QuoteRange } from "../../../lib/api-client";
import styles from "./ChartSection.module.css";

const PERIOD_TO_RANGE: Record<string, QuoteRange> = {
  "1M": "1mo",
  "3M": "3mo",
  "6M": "6mo",
  "1Y": "1y",
  "5Y": "5y",
};

const PERIODS = ["1M", "3M", "6M", "1Y", "5Y"] as const;
const ACTIVE_PERIOD = "6M";

const CHART_TYPES = ["라인"] as const;
const INDICATORS = ["MA(20)", "MA(60)", "볼린저", "RSI", "MACD"] as const;

type ChartSectionProps = {
  detail: StockDetail;
};

function formatTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ChartSection({ detail }: ChartSectionProps) {
  const range = PERIOD_TO_RANGE[ACTIVE_PERIOD];
  const state = useQuote(detail.symbol, range);

  let sourceLine: string;
  if (state.status === "ready") {
    sourceLine = state.quote.stale
      ? `데이터: Polygon · 캐시 표시 · ${formatTime(state.quote.last_refreshed_at)} 기준 (재시도 중)`
      : `데이터: Polygon · ${formatTime(state.quote.last_refreshed_at)} 갱신`;
  } else if (state.status === "loading") {
    sourceLine = "데이터: 불러오는 중…";
  } else if (state.status === "empty") {
    sourceLine = "데이터: 제공자가 응답하지 않습니다.";
  } else {
    sourceLine = `데이터: 오류 (${state.message})`;
  }

  return (
    <Card title="풀 차트" eyebrow="실시간 가격 (일봉)">
      <div className={styles.sourceBar}>{sourceLine}</div>

      <div className={styles.periodGroup}>
        {PERIODS.map((p) => (
          <span
            key={p}
            className={`${styles.periodPill} ${
              p === ACTIVE_PERIOD ? styles.periodActive : ""
            }`}
          >
            {p}
          </span>
        ))}
        <span className={styles.divider} aria-hidden="true" />
        {CHART_TYPES.map((t) => (
          <span key={t} className={`${styles.periodPill} ${styles.periodActive}`}>
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

      {state.status === "ready" ? (
        <PriceChart
          bars={state.quote.bars}
          height={300}
          ariaLabel={`${detail.symbol} 일봉 차트`}
        />
      ) : (
        <ChartPlaceholder
          label={
            state.status === "loading"
              ? `${detail.symbol} 차트 불러오는 중…`
              : state.status === "empty"
                ? "데이터 없음"
                : "차트를 표시할 수 없습니다"
          }
          height={300}
        />
      )}

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
