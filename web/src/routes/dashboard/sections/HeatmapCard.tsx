import { useMemo } from "react";
import { Card } from "../../../components/primitives/Card";
import { useBreadth } from "../../../lib/useDashboardLive";
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

function colorFor(change: number): string {
  const up = change >= 0;
  const intensity = Math.min(Math.abs(change) / 5, 1);
  return up
    ? `rgba(226,58,58,${0.18 + intensity * 0.55})`
    : `rgba(37,99,235,${0.18 + intensity * 0.55})`;
}

function buildCellsFixture(seed: number, title: string): Cell[] {
  const labels = title.includes("한국") ? KR_LABELS : US_LABELS;
  return Array.from({ length: 60 }, (_, i) => {
    const v = (((i * seed + seed * 3) % 7) - 3) / 3;
    const change = Number((v * 3.2).toFixed(2));
    return {
      id: `${seed}-${i}`,
      bg: colorFor(change),
      label: labels[i % labels.length],
      change,
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
  const market: "US" | "KR" = title.includes("한국") ? "KR" : "US";
  const live = useBreadth(market);
  const liveCells: Cell[] = live.status === "ready"
    ? live.data.cells.slice(0, 30).map((c, i) => ({
        id: `${c.symbol}-${i}`,
        bg: colorFor(c.change_pct),
        label: c.symbol,
        change: Number(c.change_pct.toFixed(2)),
        spanRow: i === 0 ? 2 : 1,
        spanCol: i === 0 ? 2 : 1,
      }))
    : [];
  const cellsFixture = useMemo(() => buildCellsFixture(seed, title), [seed, title]);
  const cells = liveCells.length > 0 ? liveCells : cellsFixture;
  const liveSub = live.status === "ready" && liveCells.length > 0
    ? `상승 ${live.data.rising} · 하락 ${live.data.falling} · 총 ${live.data.total}`
    : sub;

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        <span className={styles.sub}>{liveSub}</span>
      </div>
      <div className={styles.grid}>
        {cells.map((cell) => (
          <button
            type="button"
            key={cell.id}
            className={styles.cell}
            aria-label={`${cell.label} ${cell.change >= 0 ? "+" : ""}${cell.change}% 상세`}
            onClick={() => onOpenCell?.(title, liveSub, cell.label, cell.change)}
            style={{
              background: cell.bg,
              gridRow: `span ${cell.spanRow}`,
              gridColumn: `span ${cell.spanCol}`,
            }}
            title={`${cell.label} ${cell.change >= 0 ? "+" : ""}${cell.change}%`}
          >
            <span className={styles.cellLabel}>{cell.label}</span>
            <span className={styles.cellChange}>{cell.change >= 0 ? "+" : ""}{cell.change}%</span>
          </button>
        ))}
      </div>
      <div className={styles.footer}>
        <span>
          <span className={styles.legendUp}>● 상승</span>
          <span className={styles.legendDown}>● 하락</span>
        </span>
        <button type="button" className={styles.viewAll} onClick={() => onOpenAll?.(title, liveSub)}>
          전체 보기 →
        </button>
      </div>
    </Card>
  );
}
