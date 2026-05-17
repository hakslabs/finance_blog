import type { QuoteBar } from "../../lib/api-client";
import styles from "./PriceChart.module.css";

type Props = {
  bars: QuoteBar[];
  height?: number;
  ariaLabel: string;
};

const PADDING = { top: 4, right: 8, bottom: 12, left: 36 };

export function VolumeBars({ bars, height = 60, ariaLabel }: Props) {
  if (bars.length === 0) {
    return (
      <div className={styles.empty} style={{ minHeight: height }}>
        데이터 없음
      </div>
    );
  }
  const width = 800;
  const innerW = width - PADDING.left - PADDING.right;
  const innerH = height - PADDING.top - PADDING.bottom;
  const max = Math.max(...bars.map((b) => b.v || 0)) || 1;
  const barW = Math.max(1, innerW / bars.length - 1);
  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={styles.svg}
      style={{ height }}
    >
      {bars.map((b, i) => {
        const h = ((b.v || 0) / max) * innerH;
        const up = i === 0 ? true : b.c >= bars[i - 1].c;
        const x = PADDING.left + (i * innerW) / bars.length;
        const y = PADDING.top + innerH - h;
        return (
          <rect
            key={b.t}
            x={x}
            y={y}
            width={barW}
            height={h}
            fill={up ? "var(--positive)" : "var(--negative)"}
            opacity={0.75}
          />
        );
      })}
    </svg>
  );
}
