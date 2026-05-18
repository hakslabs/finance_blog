import { useState } from "react";
import { Card } from "../../../components/primitives/Card";
import { ChartPlaceholder } from "../../../components/primitives/ChartPlaceholder";
import { PriceChart } from "../../../components/primitives/PriceChart";
import { VolumeBars } from "../../../components/primitives/VolumeBars";
import { RSIChart } from "../../../components/primitives/RSIChart";
import { MACDChart } from "../../../components/primitives/MACDChart";
import { rsi14, macd } from "../../../lib/indicators";
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

const CHART_TYPES = ["라인", "캔들"] as const;
const INDICATORS = ["MA(20)", "MA(60)", "볼린저", "RSI", "MACD"] as const;
type Period = (typeof PERIODS)[number];
type ChartType = (typeof CHART_TYPES)[number];

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
  const [activePeriod, setActivePeriod] = useState<Period>("6M");
  const [chartType, setChartType] = useState<ChartType>("라인");
  const [activeIndicators, setActiveIndicators] = useState(() => new Set<string>(["MA(20)", "RSI", "MACD"]));
  const range = PERIOD_TO_RANGE[activePeriod];
  const state = useQuote(detail.symbol, range);

  let sourceLine: string;
  if (state.status === "ready") {
    sourceLine = state.quote.stale
      ? `데이터: ${formatTime(state.quote.last_refreshed_at)} 기준 (캐시)`
      : `데이터: ${formatTime(state.quote.last_refreshed_at)} 갱신`;
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
          <button
            type="button"
            key={p}
            className={`${styles.periodPill} ${
              p === activePeriod ? styles.periodActive : ""
            }`}
            onClick={() => setActivePeriod(p)}
            aria-pressed={p === activePeriod}
          >
            {p}
          </button>
        ))}
        <span className={styles.divider} aria-hidden="true" />
        {CHART_TYPES.map((t) => (
          <button
            type="button"
            key={t}
            className={`${styles.periodPill} ${t === chartType ? styles.periodActive : ""}`}
            onClick={() => setChartType(t)}
            aria-pressed={t === chartType}
          >
            {t}
          </button>
        ))}
        <span className={styles.divider} aria-hidden="true" />
        {INDICATORS.map((ind) => (
          <button
            type="button"
            key={ind}
            className={`${styles.periodPill} ${activeIndicators.has(ind) ? styles.periodActive : ""}`}
            onClick={() =>
              setActiveIndicators((current) => {
                const next = new Set(current);
                if (next.has(ind)) next.delete(ind);
                else next.add(ind);
                return next;
              })
            }
            aria-pressed={activeIndicators.has(ind)}
          >
            {ind}
          </button>
        ))}
      </div>

      {state.status === "ready" ? (
        <PriceChart
          bars={state.quote.bars}
          height={300}
          ariaLabel={`${detail.symbol} ${activePeriod} ${chartType} 차트`}
          overlays={{
            ma20: activeIndicators.has("MA(20)"),
            ma60: activeIndicators.has("MA(60)"),
          }}
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
        {state.status === "ready" ? (
          <VolumeBars bars={state.quote.bars} height={60} ariaLabel={`${detail.symbol} ${activePeriod} 거래량`} />
        ) : (
          <ChartPlaceholder label="거래량 차트" height={50} />
        )}
      </div>

{(() => {
        const bars = state.status === "ready" ? state.quote.bars : [];
        const closes = bars.map((b) => b.c);
        const rsiSeries = closes.length >= 16 ? rsi14(closes) : [];
        const lastRsi = (() => {
          for (let i = rsiSeries.length - 1; i >= 0; i--) {
            const v = rsiSeries[i];
            if (v != null) return v;
          }
          return null;
        })();
        const rsiLabel = lastRsi != null
          ? `${lastRsi.toFixed(1)} · ${lastRsi >= 70 ? "과매수" : lastRsi <= 30 ? "과매도" : "중립"}`
          : "데이터 부족";
        const macdSeries = closes.length >= 30 ? macd(closes) : [];
        const lastM = (() => {
          for (let i = macdSeries.length - 1; i >= 0; i--) {
            if (macdSeries[i].macd != null && macdSeries[i].signal != null) return macdSeries[i];
          }
          return null;
        })();
        const macdLabel = lastM && lastM.macd != null && lastM.signal != null
          ? `MACD ${(lastM.macd as number).toFixed(2)} · Signal ${(lastM.signal as number).toFixed(2)}`
          : "데이터 부족";
        const macdTone = lastM && lastM.hist != null && (lastM.hist as number) >= 0 ? styles.subPositive : styles.subNeutral;
        return (
          <>
            <div className={styles.subPanel}>
              <div className={styles.subPanelHeader}>
                <span>RSI(14)</span>
                <span className={`${styles.subPanelValue} ${styles.subNeutral}`}>
                  {activeIndicators.has("RSI") ? rsiLabel : "숨김"}
                </span>
              </div>
              {activeIndicators.has("RSI") && bars.length >= 16 ? (
                <RSIChart bars={bars} height={60} ariaLabel={`${detail.symbol} RSI(14)`} />
              ) : (
                <ChartPlaceholder label="RSI(14) 지표" height={50} />
              )}
            </div>
            <div className={styles.subPanel}>
              <div className={styles.subPanelHeader}>
                <span>MACD (12,26,9)</span>
                <span className={`${styles.subPanelValue} ${macdTone}`}>
                  {activeIndicators.has("MACD") ? macdLabel : "숨김"}
                </span>
              </div>
              {activeIndicators.has("MACD") && bars.length >= 30 ? (
                <MACDChart bars={bars} height={70} ariaLabel={`${detail.symbol} MACD`} />
              ) : (
                <ChartPlaceholder label="MACD 지표" height={50} />
              )}
            </div>
          </>
        );
      })()}
    </Card>
  );
}
