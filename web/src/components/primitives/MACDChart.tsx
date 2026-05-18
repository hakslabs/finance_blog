import { macd } from "../../lib/indicators";
import type { QuoteBar } from "../../lib/api-client";
import styles from "./PriceChart.module.css";

type Props = { bars: QuoteBar[]; height?: number; ariaLabel: string };
const PADDING = { top: 4, right: 8, bottom: 12, left: 36 };

export function MACDChart({ bars, height = 70, ariaLabel }: Props) {
  if (bars.length < 30) {
    return <div className={styles.empty} style={{ minHeight: height }}>MACD 계산 데이터 부족</div>;
  }
  const closes = bars.map((b) => b.c);
  const series = macd(closes);
  const valid = series.map((p, i) => ({ ...p, i })).filter((p) => p.macd != null);
  const vals = valid.flatMap((p) => [p.macd as number, p.signal as number].filter((v): v is number => v != null));
  if (vals.length === 0) {
    return <div className={styles.empty} style={{ minHeight: height }}>MACD 데이터 없음</div>;
  }
  const max = Math.max(...vals, 0);
  const min = Math.min(...vals, 0);
  const span = max - min || 1;
  const width = 800;
  const innerW = width - PADDING.left - PADDING.right;
  const innerH = height - PADDING.top - PADDING.bottom;
  const stepX = bars.length > 1 ? innerW / (bars.length - 1) : 0;
  const y = (v: number) => PADDING.top + innerH - ((v - min) / span) * innerH;
  const zero = y(0);
  const macdPts: string[] = [];
  const sigPts: string[] = [];
  valid.forEach((p) => {
    macdPts.push(`${PADDING.left + p.i * stepX},${y(p.macd as number)}`);
    if (p.signal != null) sigPts.push(`${PADDING.left + p.i * stepX},${y(p.signal as number)}`);
  });
  const barW = Math.max(1, stepX * 0.6);

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={styles.svg}
      style={{ height }}
    >
      <line x1={PADDING.left} x2={width - PADDING.right} y1={zero} y2={zero} className={styles.grid} />
      <text x={4} y={zero + 3} className={styles.tickLabel}>0</text>
      {valid.map((p) => {
        if (p.hist == null) return null;
        const h = p.hist as number;
        const yTop = h >= 0 ? y(h) : zero;
        const hBar = Math.abs(zero - y(h));
        return (
          <rect
            key={p.i}
            x={PADDING.left + p.i * stepX - barW / 2}
            y={yTop}
            width={barW}
            height={hBar}
            fill={h >= 0 ? "var(--positive)" : "var(--negative)"}
            opacity={0.55}
          />
        );
      })}
      <polyline fill="none" stroke="var(--accent)" strokeWidth={1.4} points={macdPts.join(" ")} />
      <polyline fill="none" stroke="var(--warning)" strokeWidth={1.2} points={sigPts.join(" ")} />
    </svg>
  );
}
