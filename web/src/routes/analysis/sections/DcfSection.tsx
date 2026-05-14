import { Card } from "../../../components/primitives/Card";
import { ChartPlaceholder } from "../../../components/primitives/ChartPlaceholder";
import { KpiTile } from "../../../components/primitives/KpiTile";
import { DCF_ASSUMPTIONS } from "../../../fixtures/analysis";
import styles from "./DcfSection.module.css";

export function DcfSection() {
  return (
    <div className={styles.root}>
      <Card>
        <div className={styles.kpiGrid}>
          {DCF_ASSUMPTIONS.map((a) => (
            <KpiTile
              key={a.id}
              label={a.label}
              value={a.value}
              detail={a.detail}
            />
          ))}
        </div>
      </Card>

      <Card title="DCF 시나리오 · 적정주가 분포">
        <ChartPlaceholder label="할인율 · 성장률 시나리오 매트릭스" height={200} />
      </Card>
    </div>
  );
}
