import { Card } from "../../../components/primitives/Card";
import { Badge } from "../../../components/primitives/Badge";
import { ChartPlaceholder } from "../../../components/primitives/ChartPlaceholder";
import {
  DataTable,
  type DataTableColumn,
} from "../../../components/primitives/DataTable";
import {
  FINANCIAL_SCORES,
  type FinancialScore,
  type FinancialGrade,
} from "../../../fixtures/analysis";
import styles from "./FinancialAnalysisSection.module.css";

const GRADE_TONE: Record<FinancialGrade, "positive" | "accent" | "neutral" | "negative"> = {
  A: "positive",
  B: "accent",
  C: "neutral",
  D: "negative",
};

const columns: DataTableColumn<FinancialScore>[] = [
  {
    key: "symbol",
    header: "종목",
    render: (r) => <span className={styles.mono}>{r.symbol}</span>,
  },
  { key: "per", header: "PER", align: "right", render: (r) => <span className={styles.mono}>{r.per}</span> },
  { key: "pbr", header: "PBR", align: "right", render: (r) => <span className={styles.mono}>{r.pbr}</span> },
  { key: "roe", header: "ROE", align: "right", render: (r) => <span className={styles.mono}>{r.roe}</span> },
  { key: "netMargin", header: "순이익률", align: "right", render: (r) => <span className={styles.mono}>{r.netMargin}</span> },
  { key: "debtRatio", header: "부채비율", align: "right", render: (r) => <span className={styles.mono}>{r.debtRatio}</span> },
  {
    key: "score",
    header: "점수",
    align: "right",
    render: (r) => <Badge tone={GRADE_TONE[r.score]}>{r.score}</Badge>,
  },
];

export function FinancialAnalysisSection({
  onOpenScore,
  onOpenChart,
}: {
  onOpenScore?: (row: FinancialScore) => void;
  onOpenChart?: (label: string) => void;
}) {
  return (
    <div className={styles.root}>
      <Card title="재무 비율 5년 추이">
        <ChartPlaceholder
          label="PER · PBR · ROE 5년 추이"
          height={200}
          onOpen={() => onOpenChart?.("PER · PBR · ROE 5년 추이")}
        />
      </Card>

      <Card title="재무 점수 (관심·보유종목)">
        <DataTable<FinancialScore>
          columns={columns}
          rows={FINANCIAL_SCORES}
          getRowKey={(r) => r.id}
          density="compact"
          onRowClick={onOpenScore}
          getRowAriaLabel={(r) => `${r.symbol} 재무 점수 상세`}
        />
      </Card>
    </div>
  );
}
