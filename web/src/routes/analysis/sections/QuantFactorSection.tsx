import { Card } from "../../../components/primitives/Card";
import { ChartPlaceholder } from "../../../components/primitives/ChartPlaceholder";
import {
  DataTable,
  type DataTableColumn,
} from "../../../components/primitives/DataTable";
import {
  QUANT_FACTORS,
  type QuantFactor,
} from "../../../fixtures/analysis";
import styles from "./QuantFactorSection.module.css";

const columns: DataTableColumn<QuantFactor>[] = [
  {
    key: "factor",
    header: "팩터",
    render: (r) => (
      <span className={styles.factorCell}>
        <span className={styles.factorName}>{r.factor}</span>
        <span className={styles.factorDesc}>{r.description}</span>
      </span>
    ),
  },
  {
    key: "top",
    header: "Top 분위",
    align: "right",
    render: (r) => <span className={styles.mono}>{r.topReturn}</span>,
  },
  {
    key: "bottom",
    header: "Bottom 분위",
    align: "right",
    render: (r) => <span className={styles.mono}>{r.bottomReturn}</span>,
  },
  {
    key: "spread",
    header: "스프레드",
    align: "right",
    render: (r) => (
      <span
        className={`${styles.mono} ${r.spreadPositive ? styles.pos : styles.neg}`}
      >
        {r.spread}
      </span>
    ),
  },
];

export function QuantFactorSection({
  onOpenFactor,
}: {
  onOpenFactor?: (row: QuantFactor) => void;
}) {
  return (
    <div className={styles.root}>
      <Card title="팩터 누적 수익률 (12M)">
        <ChartPlaceholder label="Value · Momentum · Quality · Size · LowVol" height={180} />
      </Card>

      <Card title="팩터 분위 수익률">
        <DataTable<QuantFactor>
          columns={columns}
          rows={QUANT_FACTORS}
          getRowKey={(r) => r.id}
          density="compact"
          onRowClick={onOpenFactor}
          getRowAriaLabel={(r) => `${r.factor} 팩터 상세`}
        />
      </Card>
    </div>
  );
}
