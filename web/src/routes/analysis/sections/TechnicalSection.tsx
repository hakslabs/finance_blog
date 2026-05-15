import { Card } from "../../../components/primitives/Card";
import { Badge } from "../../../components/primitives/Badge";
import { ChartPlaceholder } from "../../../components/primitives/ChartPlaceholder";
import {
  DataTable,
  type DataTableColumn,
} from "../../../components/primitives/DataTable";
import {
  TECHNICAL_INDICATORS,
  type TechnicalIndicator,
  type TechnicalSignalKind,
} from "../../../fixtures/analysis";
import styles from "./TechnicalSection.module.css";

const SIGNAL_TONE: Record<TechnicalSignalKind, "positive" | "negative" | "neutral"> = {
  buy: "positive",
  sell: "negative",
  hold: "neutral",
};

const columns: DataTableColumn<TechnicalIndicator>[] = [
  {
    key: "symbol",
    header: "종목",
    render: (r) => <span className={styles.mono}>{r.symbol}</span>,
  },
  { key: "indicator", header: "지표", render: (r) => r.indicator },
  {
    key: "value",
    header: "값",
    align: "right",
    render: (r) => <span className={styles.mono}>{r.value}</span>,
  },
  {
    key: "signal",
    header: "신호",
    align: "right",
    render: (r) => <Badge tone={SIGNAL_TONE[r.signal]}>{r.signalLabel}</Badge>,
  },
];

export function TechnicalSection({
  onOpenIndicator,
  onOpenChart,
}: {
  onOpenIndicator?: (row: TechnicalIndicator) => void;
  onOpenChart?: (label: string) => void;
}) {
  return (
    <div className={styles.root}>
      <Card title="가격 추이">
        <ChartPlaceholder
          label="기술적 지표 종합 차트"
          height={200}
          onOpen={() => onOpenChart?.("기술적 지표 종합 차트")}
        />
      </Card>

      <Card title="기술적 지표 스캔">
        <DataTable<TechnicalIndicator>
          columns={columns}
          rows={TECHNICAL_INDICATORS}
          getRowKey={(r) => r.id}
          density="compact"
          onRowClick={onOpenIndicator}
          getRowAriaLabel={(r) => `${r.symbol} ${r.indicator} 상세`}
        />
      </Card>
    </div>
  );
}
