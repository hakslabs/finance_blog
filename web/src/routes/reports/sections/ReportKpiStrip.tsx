import { KpiTile } from "../../../components/primitives/KpiTile";
import type { ReportKpi } from "../../../fixtures/reports";
import styles from "../ReportsPage.module.css";

export function ReportKpiStrip({ kpis }: { kpis: ReportKpi[] }) {
  return (
    <div className={styles.kpiGrid}>
      {kpis.map((kpi) => (
        <KpiTile
          key={kpi.id}
          label={kpi.label}
          value={kpi.value}
          detail={kpi.detail}
          trend={
            kpi.trend ? (
              <span className={styles.trendPositive}>{kpi.trend}</span>
            ) : null
          }
        />
      ))}
    </div>
  );
}
