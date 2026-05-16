import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../../../components/primitives/Badge";
import { Card } from "../../../components/primitives/Card";
import type { TopMover } from "../../../fixtures/dashboard";
import { useMovers } from "../../../lib/useMovers";
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

function fmtNumber(n: number, market: MarketCode): string {
  if (market === "KR") return Math.round(n).toLocaleString("ko-KR");
  return n.toFixed(2);
}

function fmtVolume(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return String(v);
}

export function TopMoversCard({ moversByMarket, initialMarket, sessions }: Props) {
  const [manualMarket, setManualMarket] = useState<MarketCode | null>(null);
  const selectedMarket = manualMarket ?? initialMarket;

  const live = useMovers(selectedMarket as "US" | "KR", 6);
  const liveMovers: TopMover[] = live.status === "ready"
    ? live.data.items.map((m) => ({
        rank: m.rank,
        symbol: m.symbol,
        name: m.name,
        market: selectedMarket,
        price: fmtNumber(m.last, selectedMarket),
        change: `${m.change_pct >= 0 ? "+" : ""}${m.change_pct.toFixed(2)}%`,
        up: m.change_pct >= 0,
        volume: fmtVolume(m.volume),
      }))
    : [];
  const movers = liveMovers.length > 0 ? liveMovers : moversByMarket[selectedMarket];
  const sourceLabel = live.status === "ready" && liveMovers.length > 0
    ? `DB · ${liveMovers.length}건`
    : live.status === "loading"
      ? "DB 로딩 중 · fixture 표시"
      : "DB 비어있음 · fixture 표시";
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
        <span>{session?.label ?? "선택 시장"} · {sourceLabel}</span>
      </div>
    </Card>
  );
}
