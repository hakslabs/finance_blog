import { Card } from "../../../components/primitives/Card";
import { ChartPlaceholder } from "../../../components/primitives/ChartPlaceholder";
import { KpiTile } from "../../../components/primitives/KpiTile";
import { DCF_ASSUMPTIONS, type DcfAssumption } from "../../../fixtures/analysis";
import styles from "./DcfSection.module.css";

export function DcfSection({
  onOpenAssumption,
  onOpenChart,
}: {
  onOpenAssumption?: (row: DcfAssumption) => void;
  onOpenChart?: (label: string) => void;
}) {
  return (
    <div className={styles.root}>
      <Card>
        <div className={styles.kpiGrid}>
          {DCF_ASSUMPTIONS.map((a) => (
            <button
              key={a.id}
              type="button"
              className={styles.kpiButton}
              onClick={() => onOpenAssumption?.(a)}
            >
              <KpiTile
              key={a.id}
              label={a.label}
              value={a.value}
              detail={a.detail}
            />
            </button>
          ))}
        </div>
      </Card>

      <Card title="DCF 시나리오 · 적정주가 분포">
        <ChartPlaceholder
          label="할인율 · 성장률 시나리오 매트릭스"
          height={200}
          onOpen={() => onOpenChart?.("할인율 · 성장률 시나리오 매트릭스")}
        />
      </Card>
    </div>
  );
}
