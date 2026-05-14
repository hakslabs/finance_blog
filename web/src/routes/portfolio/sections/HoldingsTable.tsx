import { Card } from "../../../components/primitives/Card";
import { EmptyState } from "../../../components/primitives/EmptyState";
import {
  DataTable,
  type DataTableColumn,
} from "../../../components/primitives/DataTable";
import type { Holding, HoldingMemoStatus } from "../../../fixtures/portfolio";
import styles from "./HoldingsTable.module.css";

const PNL_CLASS: Record<"up" | "down", string> = {
  up: styles.pnlPos,
  down: styles.pnlNeg,
};

const MEMO_STATUS_CLASS: Record<HoldingMemoStatus, string> = {
  locked: styles.memoLocked,
  memo: styles.memoHas,
  none: styles.memoNone,
};

const MEMO_STATUS_LABEL: Record<HoldingMemoStatus, (count: number) => string> = {
  locked: (c) => `🔒 ${c}`,
  memo: (c) => `✎ ${c}`,
  none: () => "—",
};

const columns: DataTableColumn<Holding>[] = [
  {
    key: "symbol",
    header: "종목",
    render: (row) => (
      <span className={styles.symbol}>
        <span className={styles.symbolIcon} aria-hidden="true">
          {row.symbol[0]}
        </span>
        <span className={styles.symbolText}>
          <span className={styles.symbolCode}>{row.symbol}</span>
          <span className={styles.symbolName}>{row.name}</span>
        </span>
      </span>
    ),
  },
  {
    key: "quantity",
    header: "수량",
    align: "right",
    render: (row) => row.quantity,
  },
  {
    key: "averagePrice",
    header: "평단가",
    align: "right",
    render: (row) => row.averagePrice,
  },
  {
    key: "currentPrice",
    header: "현재가",
    align: "right",
    render: (row) => row.currentPrice,
  },
  {
    key: "marketValue",
    header: "평가금액",
    align: "right",
    render: (row) => row.marketValue,
  },
  {
    key: "pnl",
    header: "손익률",
    align: "right",
    render: (row) => (
      <span className={PNL_CLASS[row.up ? "up" : "down"]}>{row.pnlPercent}</span>
    ),
  },
  {
    key: "weight",
    header: "비중",
    align: "right",
    render: (row) => `${row.weight}%`,
  },
  {
    key: "memo",
    header: "메모",
    align: "right",
    render: (row) => (
      <span className={MEMO_STATUS_CLASS[row.memoStatus]}>
        {MEMO_STATUS_LABEL[row.memoStatus](row.memoCount)}
      </span>
    ),
  },
];

export function HoldingsTable({ holdings }: { holdings: Holding[] }) {
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
      <DataTable<Holding>
        columns={columns}
        rows={holdings}
        getRowKey={(row) => row.id}
        density="compact"
      />
    </Card>
  );
}
