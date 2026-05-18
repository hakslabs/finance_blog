import { KpiStrip, type KpiStripItem } from "../../../components/primitives/KpiStrip";
import type { ReportKpi } from "../../../fixtures/reports";
import styles from "../ReportsPage.module.css";

export function ReportKpiStrip({ kpis }: { kpis: ReportKpi[] }) {
  const items: KpiStripItem[] = kpis.map((kpi) => ({
    id: kpi.id,
    label: kpi.label,
    value: kpi.value,
    detail: kpi.detail,
    trend: kpi.trend ? (
      <span className={styles.trendPositive}>{kpi.trend}</span>
    ) : null,
  }));
  return <KpiStrip items={items} ariaLabel="리포트 요약" />;
}
