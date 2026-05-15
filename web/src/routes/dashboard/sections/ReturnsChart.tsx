import { useMemo, useState } from "react";
import { Card } from "../../../components/primitives/Card";
import type { ReturnContributor, ReturnSeries } from "../../../fixtures/dashboard";
import styles from "./ReturnsChart.module.css";

const PERIODS = ["1D", "1W", "1M", "3M", "1Y", "ALL"] as const;
const GRID_Y = [32.5, 65, 97.5];

function areaPath(
  seed: string,
  width: number,
  height: number,
  points = 80
): string {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const rand = () => {
    hash = Math.imul(hash ^ (hash >>> 13), 16777619);
    return (hash >>> 0) / 4294967296;
  };

  let value = 50;
  const coords: string[] = [];
  for (let i = 0; i < points; i++) {
    value += (rand() - 0.45) * 6;
    value = Math.max(5, Math.min(95, value));
    const x = (i / (points - 1)) * width;
    const y = height - (value / 100) * height;
    coords.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }

  return `M${coords.join("L")}`;
}

export function ReturnsChart({
  data,
  onOpenContributor,
  onOpenReturns,
  onSendReview,
}: {
  data: ReturnSeries;
  onOpenContributor?: (contributor: ReturnContributor) => void;
  onOpenReturns?: (period: string) => void;
  onSendReview?: () => void;
}) {
  const [selectedPeriod, setSelectedPeriod] = useState(data.period);
  const paths = useMemo(
    () => ({
      portfolio: areaPath(`home-portfolio-${selectedPeriod}`, 600, 130),
      kospi: areaPath(`home-kospi-${selectedPeriod}`, 600, 130),
      spx: areaPath(`home-spx-${selectedPeriod}`, 600, 130),
    }),
    [selectedPeriod]
  );

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>내 수익률 vs 시장</h2>
        <div className={styles.periods}>
          {PERIODS.map((p) => (
            <button
              type="button"
              key={p}
              className={
                p === selectedPeriod ? styles.periodPillActive : styles.periodPill
              }
              onClick={() => setSelectedPeriod(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.rule} />
      <button
        type="button"
        className={styles.chartArea}
        onClick={() => onOpenReturns?.(selectedPeriod)}
      >
        <svg
          className={styles.svg}
          viewBox="0 0 600 130"
          role="img"
          aria-label="내 포트폴리오, KOSPI, S&P 500 수익률 비교 차트"
          preserveAspectRatio="none"
        >
          {GRID_Y.map((y) => (
            <line
              key={y}
              x1="0"
              x2="600"
              y1={y}
              y2={y}
              className={styles.gridLine}
            />
          ))}
          <path
            d={`${paths.portfolio} L600,130 L0,130 Z`}
            className={styles.portfolioArea}
          />
          <path d={paths.portfolio} className={styles.portfolioLine} />
          <path d={paths.kospi} className={styles.kospiLine} />
          <path d={paths.spx} className={styles.spxLine} />
        </svg>
      </button>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.swatchPortfolio} />
          <span className={styles.legendLabel}>내 포트폴리오</span>
          <b className={styles.legendValuePos}>{data.portfolioReturn}</b>
        </span>
        <span className={styles.legendItem}>
          <span className={styles.swatchKospi} />
          <span className={styles.legendLabel}> KOSPI</span>
          <b className={styles.legendValue}>{data.kospiReturn}</b>
        </span>
        <span className={styles.legendItem}>
          <span className={styles.swatchSpx} />
          <span className={styles.legendLabel}> S&amp;P 500</span>
          <b className={styles.legendValue}>{data.sp500Return}</b>
        </span>
      </div>
      <div className={styles.rule} />
      <div className={styles.contribHeader}>
        <span className={styles.contribHeading}>
          시장 대비 +4.2%p · 기여 요인
        </span>
        <button type="button" className={styles.contribAction} onClick={onSendReview}>
          복기로 보내기 →
        </button>
      </div>
      {data.contributors.map((c) => (
        <button
          key={c.symbol}
          type="button"
          className={styles.contribRow}
          onClick={() => onOpenContributor?.(c)}
        >
          <span className={styles.contribSymbol}>{c.symbol}</span>
          <span className={styles.contribName}>{c.name}</span>
          <span className={styles.contribReason}>{c.reason}</span>
          <span
            className={c.up ? styles.contribValuePos : styles.contribValueNeg}
          >
            {c.contribution}
          </span>
        </button>
      ))}
      <div className={styles.learning}>
        <b className={styles.learningStrong}>학습 포인트.</b>{" "}
        {data.learningPoint}
      </div>
    </Card>
  );
}
