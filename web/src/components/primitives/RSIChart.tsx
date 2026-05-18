import { rsi14 } from "../../lib/indicators";
import type { QuoteBar } from "../../lib/api-client";
import styles from "./PriceChart.module.css";

type Props = { bars: QuoteBar[]; height?: number; ariaLabel: string };
const PADDING = { top: 4, right: 8, bottom: 12, left: 36 };

export function RSIChart({ bars, height = 60, ariaLabel }: Props) {
  if (bars.length < 16) {
    return <div className={styles.empty} style={{ minHeight: height }}>RSI 계산 데이터 부족</div>;
  }
  const closes = bars.map((b) => b.c);
  const values = rsi14(closes);
  const width = 800;
  const innerW = width - PADDING.left - PADDING.right;
  const innerH = height - PADDING.top - PADDING.bottom;
  const stepX = bars.length > 1 ? innerW / (bars.length - 1) : 0;
  const y = (v: number) => PADDING.top + innerH - (v / 100) * innerH;
  const pts: string[] = [];
  values.forEach((v, i) => {
    if (v == null) return;
    pts.push(`${PADDING.left + i * stepX},${y(v)}`);
  });
  const last = values.filter((v): v is number => v != null).pop();
  const stroke = last != null && last >= 70 ? "var(--positive)" : last != null && last <= 30 ? "var(--negative)" : "var(--accent)";

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={styles.svg}
      style={{ height }}
    >
      <line x1={PADDING.left} x2={width - PADDING.right} y1={y(70)} y2={y(70)} className={styles.grid} />
      <line x1={PADDING.left} x2={width - PADDING.right} y1={y(30)} y2={y(30)} className={styles.grid} />
      <text x={4} y={y(70) + 3} className={styles.tickLabel}>70</text>
      <text x={4} y={y(30) + 3} className={styles.tickLabel}>30</text>
      <polyline fill="none" stroke={stroke} strokeWidth={1.4} points={pts.join(" ")} />
    </svg>
  );
}
