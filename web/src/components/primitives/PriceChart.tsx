import type { QuoteBar } from "../../lib/api-client";
import styles from "./PriceChart.module.css";

type PriceChartProps = {
  bars: QuoteBar[];
  height?: number;
  ariaLabel: string;
  overlays?: { ma20?: boolean; ma60?: boolean };
};

function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period) return out;
  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  out[period - 1] = sum / period;
  for (let i = period; i < values.length; i++) {
    sum += values[i] - values[i - period];
    out[i] = sum / period;
  }
  return out;
}

const PADDING = { top: 8, right: 8, bottom: 18, left: 36 };

export function PriceChart({ bars, height = 280, ariaLabel, overlays }: PriceChartProps) {
  if (bars.length === 0) {
    return (
      <div className={styles.empty} style={{ minHeight: height }}>
        데이터가 없습니다.
      </div>
    );
  }

  const width = 800;
  const innerW = width - PADDING.left - PADDING.right;
  const innerH = height - PADDING.top - PADDING.bottom;
  const closes = bars.map((b) => b.c);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = max - min || 1;
  const stepX = bars.length > 1 ? innerW / (bars.length - 1) : 0;
  const yFor = (v: number) =>
    PADDING.top + innerH - ((v - min) / span) * innerH;
  const points = bars
    .map((b, i) => `${PADDING.left + i * stepX},${yFor(b.c)}`)
    .join(" ");
  const lastIdx = bars.length - 1;
  const lastX = PADDING.left + lastIdx * stepX;
  const lastY = yFor(bars[lastIdx].c);
  const isUp = bars[lastIdx].c >= bars[0].c;
  const stroke = isUp ? "var(--positive)" : "var(--negative)";

  const yTicks = [min, (min + max) / 2, max];

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={styles.svg}
      style={{ height }}
    >
      {yTicks.map((v) => (
        <g key={v}>
          <line
            x1={PADDING.left}
            x2={width - PADDING.right}
            y1={yFor(v)}
            y2={yFor(v)}
            className={styles.grid}
          />
          <text x={4} y={yFor(v) + 3} className={styles.tickLabel}>
            {v.toFixed(2)}
          </text>
        </g>
      ))}
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        points={points}
      />
      {overlays?.ma20 && bars.length >= 20 ? (
        <polyline
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1}
          opacity={0.8}
          points={sma(closes, 20)
            .map((v, i) => v == null ? null : `${PADDING.left + i * stepX},${yFor(v)}`)
            .filter((p): p is string => p !== null)
            .join(" ")}
        />
      ) : null}
      {overlays?.ma60 && bars.length >= 60 ? (
        <polyline
          fill="none"
          stroke="var(--warning)"
          strokeWidth={1}
          opacity={0.8}
          points={sma(closes, 60)
            .map((v, i) => v == null ? null : `${PADDING.left + i * stepX},${yFor(v)}`)
            .filter((p): p is string => p !== null)
            .join(" ")}
        />
      ) : null}
      <circle cx={lastX} cy={lastY} r={3} fill={stroke} />
    </svg>
  );
}
