import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageContainer } from "../../components/layout/PageContainer";
import { BookmarkButton } from "../../components/primitives/BookmarkButton";
import { DataSource } from "../../components/primitives/DataSource";
import { DataTable } from "../../components/primitives/DataTable";
import { Badge } from "../../components/primitives/Badge";
import { STOCK_LIST } from "../../fixtures/stocks";
import type { StockListItem } from "../../fixtures/stocks";
import { useMovers } from "../../lib/useMovers";
import { useBreadth } from "../../lib/useDashboardLive";
import { Card } from "../../components/primitives/Card";
import styles from "./StocksPage.module.css";

function fmt(n: number, kr: boolean) {
  return kr ? Math.round(n).toLocaleString("ko-KR") : n.toFixed(2);
}

const CHANGE_CLASS: Record<"up" | "down", string> = {
  up: styles.changePos,
  down: styles.changeNeg,
};

export function StocksPage() {
  const navigate = useNavigate();
  const [market, setMarket] = useState<"US" | "KR">("US");
  const live = useMovers(market, 30);
  const breadth = useBreadth(market);
  const liveRows: StockListItem[] = live.status === "ready"
    ? live.data.items.map((m) => ({
        id: `live-${m.symbol}`,
        symbol: m.symbol,
        name: m.name,
        exchange: market === "KR" ? "KRX" : "—",
        sector: "—",
        price: fmt(m.last, market === "KR"),
        change: `${m.change_pct >= 0 ? "+" : ""}${m.change_pct.toFixed(2)}%`,
        up: m.change_pct >= 0,
        marketCap: "—",
        volume: m.volume >= 1e6 ? `${(m.volume / 1e6).toFixed(1)}M` : `${(m.volume / 1e3).toFixed(0)}K`,
      }))
    : [];
  const usingLive = liveRows.length > 0;
  const rows = usingLive ? liveRows : STOCK_LIST;

  const columns = [
    {
      key: "bookmark",
      header: "저장",
      render: (row: StockListItem) => (
        <BookmarkButton
          kind="stock"
          refId={row.symbol}
          title={`${row.symbol} · ${row.name}`}
        />
      ),
    },
    {
      key: "symbol",
      header: "종목",
      render: (row: StockListItem) => (
        <Link to={`/stocks/${row.symbol}`} className={styles.symbolLink}>
          <span className={styles.symbolCode}>{row.symbol}</span>
          <span className={styles.symbolName}>{row.name}</span>
        </Link>
      ),
    },
    ...(usingLive
      ? []
      : [
          {
            key: "exchange",
            header: "거래소",
            render: (row: StockListItem) => <Badge tone="neutral">{row.exchange}</Badge>,
          },
        ]),
    {
      key: "price",
      header: "현재가",
      align: "right" as const,
      render: (row: StockListItem) => <span className={styles.mono}>{row.price}</span>,
    },
    {
      key: "change",
      header: "변동",
      align: "right" as const,
      render: (row: StockListItem) => (
        <span className={CHANGE_CLASS[row.up ? "up" : "down"]}>{row.change}</span>
      ),
    },
    ...(usingLive
      ? []
      : [
          {
            key: "marketCap",
            header: "시가총액",
            align: "right" as const,
            render: (row: StockListItem) => row.marketCap,
          },
          {
            key: "sector",
            header: "섹터",
            render: (row: StockListItem) => (
              <span className={styles.sectorCell}>{row.sector}</span>
            ),
          },
        ]),
  ];

  return (
    <PageContainer
      eyebrow="Stocks"
      title="종목 목록"
      description={usingLive ? `${liveRows.length}건 · 일일 변동률 큰 순` : "일일 변동률 큰 순"}
      actions={
        <div className={styles.actionsRow}>
          <DataSource
            state={usingLive ? "live" : live.status === "loading" ? "loading" : "fixture"}
            source={usingLive ? "/v1/movers" : "STOCK_LIST"}
          />
          <div className={styles.marketSwitch}>
            {(["US", "KR"] as const).map((m) => (
              <button
                key={m}
                type="button"
                className={m === market ? styles.marketActive : styles.marketBtn}
                onClick={() => setMarket(m)}
              >
                {m === "US" ? "미국" : "한국"}
              </button>
            ))}
          </div>
        </div>
      }
    >
      {breadth.status === "ready" ? (
        <Card className={styles.kpiStrip}>
          <div className={styles.kpiRow}>
            <div className={styles.kpiCell}>
              <span className={styles.kpiLabel}>상승</span>
              <span className={styles.kpiUp}>{breadth.data.rising}</span>
            </div>
            <div className={styles.kpiCell}>
              <span className={styles.kpiLabel}>하락</span>
              <span className={styles.kpiDown}>{breadth.data.falling}</span>
            </div>
            <div className={styles.kpiCell}>
              <span className={styles.kpiLabel}>보합</span>
              <span className={styles.kpiVal}>{breadth.data.flat}</span>
            </div>
            <div className={styles.kpiCell}>
              <span className={styles.kpiLabel}>총 종목</span>
              <span className={styles.kpiVal}>{breadth.data.total}</span>
            </div>
            <div className={styles.kpiCell}>
              <span className={styles.kpiLabel}>상승 비율</span>
              <span className={styles.kpiVal}>{breadth.data.score.toFixed(0)}%</span>
            </div>
          </div>
        </Card>
      ) : null}
      <DataTable<StockListItem>
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        density="compact"
        emptyMessage="종목이 없습니다."
        onRowClick={(row) => navigate(`/stocks/${encodeURIComponent(row.symbol)}`)}
        getRowAriaLabel={(row) => `${row.symbol} 종목 상세`}
      />
    </PageContainer>
  );
}
