import { PageContainer } from "../../components/layout/PageContainer";
import { REPORT_KPIS, REPORTS } from "../../fixtures/reports";
import { ReportFilters } from "./sections/ReportFilters";
import { ReportKpiStrip } from "./sections/ReportKpiStrip";
import { ReportsTable } from "./sections/ReportsTable";

export function ReportsPage() {
  return (
    <PageContainer
      eyebrow="Reports"
      title="리포트"
      description="한국은행, KDI, IMF, OECD, SEC EDGAR, 증권사 리서치를 한곳에서 훑어봅니다."
      actions={<span>마지막 갱신 06:32</span>}
    >
      <ReportFilters />
      <ReportKpiStrip kpis={REPORT_KPIS} />
      <ReportsTable reports={REPORTS} />
    </PageContainer>
  );
}
