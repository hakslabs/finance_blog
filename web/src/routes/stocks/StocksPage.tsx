import { Link } from "react-router-dom";
import { PageContainer } from "../../components/layout/PageContainer";
import { DataTable } from "../../components/primitives/DataTable";
import { Badge } from "../../components/primitives/Badge";
import { STOCK_LIST } from "../../fixtures/stocks";
import type { StockListItem } from "../../fixtures/stocks";
import styles from "./StocksPage.module.css";

const CHANGE_CLASS: Record<"up" | "down", string> = {
  up: styles.changePos,
  down: styles.changeNeg,
};

const columns = [
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
    render: (row: StockListItem) => (
      <Badge tone="neutral">{row.exchange}</Badge>
    ),
  },
  {
    key: "price",
    header: "현재가",
    align: "right" as const,
    render: (row: StockListItem) => (
      <span className={styles.mono}>{row.price}</span>
    ),
  },
  {
    key: "change",
    header: "변동",
    align: "right" as const,
    render: (row: StockListItem) => (
      <span className={CHANGE_CLASS[row.up ? "up" : "down"]}>
        {row.change}
      </span>
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

export function StocksPage() {
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
      />
    </PageContainer>
  );
}
