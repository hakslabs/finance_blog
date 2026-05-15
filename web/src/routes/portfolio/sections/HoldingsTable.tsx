import { Link } from "react-router-dom";
import { Card } from "../../../components/primitives/Card";
import { EmptyState } from "../../../components/primitives/EmptyState";
import {
  DataTable,
  type DataTableColumn,
} from "../../../components/primitives/DataTable";
import type { PortfolioHolding } from "../../../lib/api-client";
import styles from "./HoldingsTable.module.css";

function formatMoney(value: number, currency: string): string {
  const sign = currency === "KRW" ? "₩" : currency === "USD" ? "$" : "";
  const digits = currency === "KRW" ? 0 : 2;
  return `${sign}${value.toLocaleString("ko-KR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

const columns: DataTableColumn<PortfolioHolding>[] = [
  {
    key: "symbol",
    header: "종목",
    render: (row) => (
      <Link className={styles.symbol} to={`/stocks/${encodeURIComponent(row.symbol)}`}>
        <span className={styles.symbolIcon} aria-hidden="true">
          {row.symbol[0]}
        </span>
        <span className={styles.symbolText}>
          <span className={styles.symbolCode}>{row.symbol}</span>
          <span className={styles.symbolName}>{row.name}</span>
        </span>
      </Link>
    ),
  },
  {
    key: "exchange",
    header: "거래소",
    render: (row) => row.exchange,
  },
  {
    key: "quantity",
    header: "수량",
    align: "right",
    render: (row) =>
      row.quantity.toLocaleString("ko-KR", { maximumFractionDigits: 6 }),
  },
  {
    key: "average_cost",
    header: "평단가",
    align: "right",
    render: (row) => formatMoney(row.average_cost, row.currency),
  },
  {
    key: "cost_basis",
    header: "투자원금",
    align: "right",
    render: (row) => formatMoney(row.cost_basis, row.currency),
  },
];

export function HoldingsTable({
  holdings,
  onOpenHolding,
}: {
  holdings: PortfolioHolding[];
  onOpenHolding?: (holding: PortfolioHolding) => void;
}) {
  if (holdings.length === 0) {
    return (
      <Card title="보유 종목" className={styles.card}>
        <EmptyState
          title="보유 종목이 없습니다"
          description="첫 거래를 기록하면 여기에 표시됩니다."
        />
      </Card>
    );
  }

  return (
    <Card title={`보유 종목 · ${holdings.length}개`} className={styles.card}>
      <DataTable<PortfolioHolding>
        columns={columns}
        rows={holdings}
        getRowKey={(row) => `${row.exchange}:${row.symbol}`}
        density="compact"
        onRowClick={onOpenHolding}
        getRowAriaLabel={(row) => `${row.symbol} 보유 상세`}
      />
    </Card>
  );
}
