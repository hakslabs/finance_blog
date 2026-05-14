import { Card } from "../../../components/primitives/Card";
import { Badge } from "../../../components/primitives/Badge";
import {
  DataTable,
  type DataTableColumn,
} from "../../../components/primitives/DataTable";
import {
  SIGNAL_ALERTS,
  type SignalAlert,
  type SignalDirection,
} from "../../../fixtures/analysis";
import styles from "./SignalsSection.module.css";

const DIR_TONE: Record<SignalDirection, "positive" | "negative" | "neutral"> = {
  up: "positive",
  down: "negative",
  neutral: "neutral",
};

const DIR_LABEL: Record<SignalDirection, string> = {
  up: "상승",
  down: "하락",
  neutral: "주의",
};

const columns: DataTableColumn<SignalAlert>[] = [
  {
    key: "ticker",
    header: "종목",
    render: (r) => <span className={styles.mono}>{r.ticker}</span>,
  },
  {
    key: "type",
    header: "신호 유형",
    render: (r) => r.type,
  },
  { key: "trigger", header: "트리거", render: (r) => r.trigger },
  {
    key: "direction",
    header: "방향",
    align: "right",
    render: (r) => <Badge tone={DIR_TONE[r.direction]}>{DIR_LABEL[r.direction]}</Badge>,
  },
  {
    key: "time",
    header: "시각",
    align: "right",
    render: (r) => <span className={styles.timeCell}>{r.time}</span>,
  },
];

export function SignalsSection() {
  return (
    <div className={styles.root}>
      <Card title="신호 알림 (관심·보유종목)">
        <DataTable<SignalAlert>
          columns={columns}
          rows={SIGNAL_ALERTS}
          getRowKey={(r) => r.id}
          density="compact"
        />
      </Card>
    </div>
  );
}
