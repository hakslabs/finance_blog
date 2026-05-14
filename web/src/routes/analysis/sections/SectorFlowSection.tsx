import { Card } from "../../../components/primitives/Card";
import { Badge } from "../../../components/primitives/Badge";
import { ChartPlaceholder } from "../../../components/primitives/ChartPlaceholder";
import {
  DataTable,
  type DataTableColumn,
} from "../../../components/primitives/DataTable";
import {
  SECTOR_MOMENTUM,
  type SectorMomentum,
  type SectorMomentumTrend,
} from "../../../fixtures/analysis";
import styles from "./SectorFlowSection.module.css";

const TREND_TONE: Record<SectorMomentumTrend, "positive" | "negative" | "neutral"> = {
  improving: "positive",
  deteriorating: "negative",
  stable: "neutral",
};

const columns: DataTableColumn<SectorMomentum>[] = [
  { key: "sector", header: "섹터", render: (r) => r.sector },
  { key: "1m", header: "1M", align: "right", render: (r) => <span className={styles.mono}>{r.oneMonth}</span> },
  { key: "3m", header: "3M", align: "right", render: (r) => <span className={styles.mono}>{r.threeMonth}</span> },
  { key: "6m", header: "6M", align: "right", render: (r) => <span className={styles.mono}>{r.sixMonth}</span> },
  {
    key: "trend",
    header: "추세",
    align: "right",
    render: (r) => <Badge tone={TREND_TONE[r.trend]}>{r.trendLabel}</Badge>,
  },
];

export function SectorFlowSection() {
  return (
    <div className={styles.root}>
      <Card title="섹터 강도 히트맵">
        <ChartPlaceholder label="섹터 × 기간 상대강도 매트릭스" height={200} />
      </Card>

      <Card title="섹터 모멘텀">
        <DataTable<SectorMomentum>
          columns={columns}
          rows={SECTOR_MOMENTUM}
          getRowKey={(r) => r.id}
          density="compact"
        />
      </Card>
    </div>
  );
}
