import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../../../components/primitives/Badge";
import { Card } from "../../../components/primitives/Card";
import type { TopMover } from "../../../fixtures/dashboard";
import type { MarketCode } from "../useDashboardClock";
import styles from "./TopMoversCard.module.css";

type Props = {
  moversByMarket: Record<MarketCode, TopMover[]>;
  initialMarket: MarketCode;
  sessions: {
    code: MarketCode;
    label: string;
    open: boolean;
    statusLabel: string;
  }[];
};

export function TopMoversCard({ moversByMarket, initialMarket, sessions }: Props) {
  const [manualMarket, setManualMarket] = useState<MarketCode | null>(null);
  const selectedMarket = manualMarket ?? initialMarket;

  const movers = moversByMarket[selectedMarket];
  const session = useMemo(
    () => sessions.find((item) => item.code === selectedMarket),
    [selectedMarket, sessions]
  );

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>실시간 상위 거래</h2>
          <Badge tone={session?.open ? "positive" : "neutral"}>
            {session?.statusLabel ?? "장 상태 확인"}
          </Badge>
        </div>
        <div className={styles.marketSwitch} aria-label="시장 선택">
          {sessions.map((item) => (
            <button
              key={item.code}
              type="button"
              className={item.code === selectedMarket ? styles.marketButtonActive : styles.marketButton}
              onClick={() => setManualMarket(item.code)}
            >
              {item.label}
            </button>
          ))}
        </div>
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
          <Link className={styles.symbol} to={`/stocks/${encodeURIComponent(s.symbol)}`}>
            <span className={styles.symbolCode}>{s.symbol}</span>
            <span className={styles.symbolName}>{s.name}</span>
          </Link>
          <span className={styles.cellPrice}>{s.price}</span>
          <span className={s.up ? styles.cellChangePos : styles.cellChangeNeg}>
            {s.change}
          </span>
          <span className={styles.cellVol}>{s.volume}</span>
        </div>
      ))}
      <div className={styles.footer}>
        <Link className={styles.footerAction} to="/stocks">전체 보기 →</Link>
        <span>{session?.label ?? "선택 시장"} · 거래대금 순 · 현재 시간 기준 기본 시장 자동 선택</span>
      </div>
    </Card>
  );
}
