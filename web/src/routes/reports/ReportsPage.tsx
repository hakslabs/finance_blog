import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "../../components/layout/PageContainer";
import { REPORT_KPIS, REPORTS } from "../../fixtures/reports";
import { useSavedItems } from "../../lib/saved-items";
import { ReportFilters } from "./sections/ReportFilters";
import { ReportKpiStrip } from "./sections/ReportKpiStrip";
import { ReportsTable } from "./sections/ReportsTable";
import styles from "./ReportsPage.module.css";

export function ReportsPage() {
  const navigate = useNavigate();
  const { items, isSaved } = useSavedItems();
  const [savedOnly, setSavedOnly] = useState(false);
  const savedCount = items.filter((entry) => entry.kind === "report").length;
  const reports = useMemo(
    () =>
      REPORTS.filter((report) => !savedOnly || isSaved("report", report.id)),
    [isSaved, savedOnly],
  );

  return (
    <PageContainer
      eyebrow="Reports"
      title="리포트"
      description="한국은행, KDI, IMF, OECD, SEC EDGAR, 증권사 리서치를 한곳에서 훑어봅니다."
      actions={
        <div className={styles.pageActions}>
          <button
            type="button"
            className={savedOnly ? styles.savedToggleActive : styles.savedToggle}
            onClick={() => setSavedOnly((value) => !value)}
          >
            관심글 {savedCount}
          </button>
          <span>마지막 갱신 06:32</span>
        </div>
      }
    >
      <ReportFilters />
      <ReportKpiStrip kpis={REPORT_KPIS} />
      <ReportsTable
        reports={reports}
        onOpenReport={(report) => navigate(`/reports/${encodeURIComponent(report.id)}`)}
      />
    </PageContainer>
  );
}
