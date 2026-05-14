import { useMemo } from "react";
import { Card } from "../../../components/primitives/Card";
import styles from "./HeatmapCard.module.css";

type Cell = {
  id: string;
  bg: string;
  spanRow: number;
  spanCol: number;
};

function buildCells(seed: number): Cell[] {
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
      spanRow: i === 0 || i === 5 ? 2 : 1,
      spanCol: i === 0 ? 2 : 1,
    };
  });
}

export function HeatmapCard({
  title,
  sub,
  seed,
}: {
  title: string;
  sub: string;
  seed: number;
}) {
  const cells = useMemo(() => buildCells(seed), [seed]);
  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        <span className={styles.sub}>{sub}</span>
      </div>
      <div className={styles.grid}>
        {cells.map((cell) => (
          <div
            key={cell.id}
            className={styles.cell}
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
        <span className={styles.viewAll}>전체 보기 →</span>
      </div>
    </Card>
  );
}
