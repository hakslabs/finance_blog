import { Card } from "../../../components/primitives/Card";
import { EmptyState } from "../../../components/primitives/EmptyState";
import { Badge } from "../../../components/primitives/Badge";
import {
  DataTable,
  type DataTableColumn,
} from "../../../components/primitives/DataTable";
import { Money } from "../../../components/primitives/Money";
import type {
  PortfolioTransaction,
  PortfolioTransactionType,
} from "../../../lib/api-client";
import type { Currency } from "../../../lib/currency";
import styles from "./TransactionsTable.module.css";

const TX_TYPE_LABEL: Record<PortfolioTransactionType, string> = {
  buy: "매수",
  sell: "매도",
  dividend: "배당",
  deposit: "입금",
};

const TX_TYPE_BADGE: Record<
  PortfolioTransactionType,
  "positive" | "negative" | "accent" | "neutral"
> = {
  buy: "positive",
  sell: "negative",
  dividend: "accent",
  deposit: "neutral",
};

const columns: DataTableColumn<PortfolioTransaction>[] = [
  {
    key: "occurred_at",
    header: "일자",
    render: (row) => <span className={styles.cellDate}>{row.occurred_at}</span>,
  },
  {
    key: "type",
    header: "유형",
    render: (row) => (
      <Badge tone={TX_TYPE_BADGE[row.type]}>{TX_TYPE_LABEL[row.type]}</Badge>
    ),
  },
  {
    key: "symbol",
    header: "종목",
    render: (row) => <span className={styles.cellSymbol}>{row.symbol ?? "—"}</span>,
  },
  {
    key: "quantity",
    header: "수량",
    align: "right",
    render: (row) =>
      row.quantity !== null
        ? row.quantity.toLocaleString("ko-KR", { maximumFractionDigits: 6 })
        : "—",
  },
  {
    key: "price",
    header: "단가",
    align: "right",
    render: (row) => <Money value={row.price} currency={row.currency as Currency} />,
  },
  {
    key: "amount",
    header: "금액",
    align: "right",
    render: (row) => <Money value={row.amount} currency={row.currency as Currency} />,
  },
  {
    key: "currency",
    header: "통화",
    render: (row) => <span className={styles.cellCurrency}>{row.currency}</span>,
  },
  {
    key: "note",
    header: "메모",
    render: (row) => <span className={styles.cellNote}>{row.note || "—"}</span>,
  },
];

export function TransactionsTable({
  transactions,
  onOpenTransaction,
}: {
  transactions: PortfolioTransaction[];
  onOpenTransaction?: (transaction: PortfolioTransaction) => void;
}) {
  if (transactions.length === 0) {
    return (
      <Card title="거래 내역" className={styles.card}>
        <EmptyState
          title="거래 내역이 없습니다"
          description="매수, 매도, 배당, 입출금 기록이 여기에 표시됩니다."
        />
      </Card>
    );
  }

  return (
    <Card title="거래 내역" className={styles.card}>
      <DataTable<PortfolioTransaction>
        columns={columns}
        rows={transactions}
        getRowKey={(row) => row.id}
        density="compact"
        onRowClick={onOpenTransaction}
        getRowAriaLabel={(row) => `${row.symbol ?? "현금"} 거래 상세`}
      />
    </Card>
  );
}
