import { Card } from "../../../components/primitives/Card";
import type { WatchlistItem } from "../../../fixtures/dashboard";
import { SPARK_ROW_DOWN, SPARK_ROW_UP } from "./sparkline";
import styles from "./WatchlistCard.module.css";

const MA_CLASS: Record<WatchlistItem["maTrend"], string> = {
  up: styles.maUp,
  down: styles.maDown,
  neutral: styles.maNeutral,
};

const MA_LABEL: Record<WatchlistItem["maTrend"], string> = {
  up: "↑",
  down: "↓",
  neutral: "=",
};

function rsiClasses(rsi: number) {
  if (rsi >= 70)
    return {
      cell: styles.rsiOverbought,
      dot: styles.rsiDotActive,
      value: styles.rsiValueActive,
      label: "과매수",
    };
  if (rsi <= 30)
    return {
      cell: styles.rsiOversold,
      dot: styles.rsiDotActive,
      value: styles.rsiValueActive,
      label: "과매도",
    };
  return {
    cell: styles.rsiNeutral,
    dot: styles.rsiDot,
    value: styles.rsiValue,
    label: String(rsi),
  };
}

export function WatchlistCard({ items }: { items: WatchlistItem[] }) {
  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>관심종목</h2>
          <span className={styles.count}>{items.length}개</span>
        </div>
        <span className={styles.legend}>
          <span className={styles.legendDotUp}>●</span> 강세{" "}
          <span className={styles.legendDotDown}>●</span> 약세
        </span>
      </div>
      <div className={styles.tableHead}>
        <div className={[styles.thGrow, styles.thSymbol].join(" ")}>종목</div>
        <div className={[styles.thFixed, styles.thPrice].join(" ")}>현재가</div>
        <div className={[styles.thFixed, styles.thChange].join(" ")}>오늘</div>
        <div className={[styles.thFixed, styles.thMa].join(" ")}>MA</div>
        <div className={[styles.thFixed, styles.thRsi].join(" ")}>RSI</div>
        <div className={[styles.thFixed, styles.thMemo].join(" ")}>메모</div>
        <div className={[styles.thFixed, styles.thEvent].join(" ")}>
          다음 이벤트
        </div>
      </div>
      {items.map((s) => {
        const rsi = rsiClasses(s.rsi);
        return (
          <div key={s.symbol} className={styles.row}>
            <div className={styles.symbol}>
              <span className={styles.symbolCode}>{s.symbol}</span>
              <span className={styles.symbolName}>{s.name}</span>
              <svg width="28" height="14" viewBox="0 0 28 14" aria-hidden="true">
                <path
                  d={s.up ? SPARK_ROW_UP : SPARK_ROW_DOWN}
                  fill="none"
                  strokeWidth="1.2"
                  className={s.up ? styles.sparkUp : styles.sparkDown}
                />
              </svg>
            </div>
            <span className={styles.cellPrice}>{s.price}</span>
            <span className={s.up ? styles.cellChangePos : styles.cellChangeNeg}>
              {s.change}
            </span>
            <span className={MA_CLASS[s.maTrend]}>{MA_LABEL[s.maTrend]}</span>
            <div className={rsi.cell}>
              <span className={rsi.dot} />
              <span className={rsi.value}>{rsi.label}</span>
            </div>
            <span className={styles.cellMemo}>
              {s.memoCount > 0 ? (
                <span className={styles.memoHasCount}>
                  ✎ {s.memoCount}
                </span>
              ) : (
                <span className={styles.memoAdd}>+ 메모</span>
              )}
            </span>
            <span className={styles.cellEvent}>{s.nextEvent}</span>
          </div>
        );
      })}
      <div className={styles.footer}>전체 보기 →</div>
    </Card>
  );
}
