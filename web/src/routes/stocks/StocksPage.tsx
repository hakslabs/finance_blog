import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Star } from "lucide-react";
import { PageContainer } from "../../components/layout/PageContainer";
import { DataTable } from "../../components/primitives/DataTable";
import { Badge } from "../../components/primitives/Badge";
import { STOCK_LIST } from "../../fixtures/stocks";
import type { StockListItem } from "../../fixtures/stocks";
import { useMovers } from "../../lib/useMovers";
import { useSavedItems } from "../../lib/saved-items";
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
  const { isSaved, toggle } = useSavedItems();
  const [market, setMarket] = useState<"US" | "KR">("US");
  const live = useMovers(market, 30);
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
  const rows = liveRows.length > 0 ? liveRows : STOCK_LIST;
  const sourceLabel = live.status === "ready" && liveRows.length > 0
    ? `DB · ${liveRows.length}건 · ${market}`
    : live.status === "loading"
      ? "DB 로딩 중 · fixture"
      : "DB 비어있음 · fixture";

  const columns = [
    {
      key: "bookmark",
      header: "저장",
      render: (row: StockListItem) => {
        const active = isSaved("stock", row.symbol);
        return (
          <button
            type="button"
            className={active ? styles.bookmarkActive : styles.bookmarkButton}
            aria-label={`${row.symbol} 저장 ${active ? "해제" : ""}`}
            onClick={(event) => {
              event.stopPropagation();
              toggle({
                kind: "stock",
                refId: row.symbol,
                title: `${row.symbol} · ${row.name}`,
              });
            }}
          >
            <Star size={14} aria-hidden="true" fill={active ? "currentColor" : "none"} />
          </button>
        );
      },
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
    {
      key: "exchange",
      header: "거래소",
      render: (row: StockListItem) => <Badge tone="neutral">{row.exchange}</Badge>,
    },
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
  ];

  return (
    <PageContainer
      eyebrow="Stocks"
      title="종목 목록"
      description={`${sourceLabel} · 일일 변동률 큰 순`}
      actions={
        <div className={styles.marketSwitch}>
          {(["US", "KR"] as const).map((m) => (
            <button
              key={m}
              type="button"
              className={m === market ? styles.marketActive : styles.marketBtn}
              onClick={() => setMarket(m)}
            >
              {m}
            </button>
          ))}
        </div>
      }
    >
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
