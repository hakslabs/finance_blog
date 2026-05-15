import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "../../components/layout/PageContainer";
import { REPORT_KPIS, REPORTS } from "../../fixtures/reports";
import { ReportFilters } from "./sections/ReportFilters";
import { ReportKpiStrip } from "./sections/ReportKpiStrip";
import { ReportsTable } from "./sections/ReportsTable";
import styles from "./ReportsPage.module.css";

const INITIAL_BOOKMARKED_REPORTS = new Set([
  "bok-monetary-2025-09",
  "berkshire-13f-2025-q3",
  "blackrock-ai-capex-2026",
]);

export function ReportsPage() {
  const navigate = useNavigate();
  const [bookmarkedIds, setBookmarkedIds] = useState(INITIAL_BOOKMARKED_REPORTS);
  const [savedOnly, setSavedOnly] = useState(false);
  const reports = useMemo(
    () => REPORTS.filter((report) => !savedOnly || bookmarkedIds.has(report.id)),
    [bookmarkedIds, savedOnly],
  );

  function toggleBookmark(id: string) {
    setBookmarkedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

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
            관심글 {bookmarkedIds.size}
          </button>
          <span>마지막 갱신 06:32</span>
        </div>
      }
    >
      <ReportFilters />
      <ReportKpiStrip kpis={REPORT_KPIS} />
      <ReportsTable
        reports={reports}
        bookmarkedIds={bookmarkedIds}
        onToggleBookmark={toggleBookmark}
        onOpenReport={(report) => navigate(`/reports/${encodeURIComponent(report.id)}`)}
      />
    </PageContainer>
  );
}
