import { Link, useNavigate } from "react-router-dom";
import { Star } from "lucide-react";
import { PageContainer } from "../../components/layout/PageContainer";
import { DataTable } from "../../components/primitives/DataTable";
import { Badge } from "../../components/primitives/Badge";
import { STOCK_LIST } from "../../fixtures/stocks";
import type { StockListItem } from "../../fixtures/stocks";
import { useSavedItems } from "../../lib/saved-items";
import styles from "./StocksPage.module.css";

const CHANGE_CLASS: Record<"up" | "down", string> = {
  up: styles.changePos,
  down: styles.changeNeg,
};

export function StocksPage() {
  const navigate = useNavigate();
  const { isSaved, toggle } = useSavedItems();

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
      description="미국 주식과 한국 주식의 종목 리스트입니다."
    >
      <DataTable<StockListItem>
        columns={columns}
        rows={STOCK_LIST}
        getRowKey={(row) => row.id}
        density="compact"
        emptyMessage="종목이 없습니다."
        onRowClick={(row) => navigate(`/stocks/${encodeURIComponent(row.symbol)}`)}
        getRowAriaLabel={(row) => `${row.symbol} 종목 상세`}
      />
    </PageContainer>
  );
}
