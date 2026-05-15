import { useMemo } from "react";
import { Card } from "../../../components/primitives/Card";
import styles from "./HeatmapCard.module.css";

type Cell = {
  id: string;
  bg: string;
  label: string;
  change: number;
  spanRow: number;
  spanCol: number;
};

const KR_LABELS = ["삼성전자", "SK하이닉스", "현대차", "NAVER", "LG엔솔", "셀트리온", "기아", "POSCO", "KB금융", "카카오"];
const US_LABELS = ["NVDA", "AAPL", "MSFT", "AMZN", "META", "TSLA", "AMD", "GOOGL", "AVGO", "JPM"];

function buildCells(seed: number, title: string): Cell[] {
  const labels = title.includes("한국") ? KR_LABELS : US_LABELS;
  return Array.from({ length: 60 }, (_, i) => {
    const v = (((i * seed + seed * 3) % 7) - 3) / 3;
    const up = v >= 0;
    const intensity = Math.abs(v);
    const bg = up
      ? `rgba(31,138,91,${0.15 + intensity * 0.45})`
      : `rgba(211,65,65,${0.15 + intensity * 0.45})`;
    return {
      id: `${seed}-${i}`,
      bg,
      label: labels[i % labels.length],
      change: Number((v * 3.2).toFixed(2)),
      spanRow: i === 0 || i === 5 ? 2 : 1,
      spanCol: i === 0 ? 2 : 1,
    };
  });
}

export function HeatmapCard({
  title,
  sub,
  seed,
  onOpenCell,
  onOpenAll,
}: {
  title: string;
  sub: string;
  seed: number;
  onOpenCell?: (title: string, sub: string, label: string, change: number) => void;
  onOpenAll?: (title: string, sub: string) => void;
}) {
  const cells = useMemo(() => buildCells(seed, title), [seed, title]);
  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        <span className={styles.sub}>{sub}</span>
      </div>
      <div className={styles.grid}>
        {cells.map((cell) => (
          <button
            type="button"
            key={cell.id}
            className={styles.cell}
            aria-label={`${cell.label} ${cell.change >= 0 ? "+" : ""}${cell.change}% 상세`}
            onClick={() => onOpenCell?.(title, sub, cell.label, cell.change)}
            style={{
              background: cell.bg,
              gridRow: `span ${cell.spanRow}`,
              gridColumn: `span ${cell.spanCol}`,
            }}
          />
        ))}
      </div>
      <div className={styles.footer}>
        <span>
          <span className={styles.legendUp}>● 상승</span>
          <span className={styles.legendDown}>● 하락</span>
        </span>
        <button type="button" className={styles.viewAll} onClick={() => onOpenAll?.(title, sub)}>
          전체 보기 →
        </button>
      </div>
    </Card>
  );
}
