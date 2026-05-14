import { Badge } from "../../../components/primitives/Badge";
import { Card } from "../../../components/primitives/Card";
import type { TopMover } from "../../../fixtures/dashboard";
import styles from "./TopMoversCard.module.css";

export function TopMoversCard({ movers }: { movers: TopMover[] }) {
  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>실시간 상위 거래</h2>
          <Badge tone="positive">KRX 개장 중</Badge>
        </div>
        <span className={styles.headerRight}>거래대금 순</span>
      </div>
      <div className={styles.tableHead}>
        <div className={styles.thRank}>#</div>
        <div className={styles.thGrow}>종목</div>
        <div className={[styles.thFixed, styles.thPrice].join(" ")}>현재가</div>
        <div className={[styles.thFixed, styles.thChange].join(" ")}>오늘</div>
        <div className={[styles.thFixed, styles.thVol].join(" ")}>거래량</div>
      </div>
      {movers.map((s) => (
        <div key={s.symbol} className={styles.row}>
          <span className={styles.rank}>{s.rank}</span>
          <div className={styles.symbol}>
            <span className={styles.symbolCode}>{s.symbol}</span>
            <span className={styles.symbolName}>{s.name}</span>
          </div>
          <span className={styles.cellPrice}>{s.price}</span>
          <span className={s.up ? styles.cellChangePos : styles.cellChangeNeg}>
            {s.change}
          </span>
          <span className={styles.cellVol}>{s.volume}</span>
        </div>
      ))}
      <div className={styles.footer}>
        <span className={styles.footerAction}>전체 보기 →</span>
        <span>21:30 NYSE 개장 시 자동 전환</span>
      </div>
    </Card>
  );
}
