import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "../../components/layout/PageContainer";
import { REPORT_KPIS, REPORTS } from "../../fixtures/reports";
import type { ReportCategory, ReportListItem, ReportRegion } from "../../fixtures/reports";
import { useReports } from "../../lib/useReports";
import { useSavedItems } from "../../lib/saved-items";
import { ReportFilters } from "./sections/ReportFilters";
import { ReportKpiStrip } from "./sections/ReportKpiStrip";
import { ReportsTable } from "./sections/ReportsTable";
import styles from "./ReportsPage.module.css";

function inferRegion(source: string, language: string): ReportRegion {
  if (language === "ko") return "KR";
  if (["IMF", "OECD", "BlackRock", "BOK"].includes(source)) return "GLOBAL";
  return "US";
}

function inferCategory(category: string | null): ReportCategory {
  if (!category) return "리서치";
  if (category === "거시") return "거시";
  if (category === "산업") return "산업";
  if (category === "공시") return "공시";
  if (category.includes("13")) return "13F";
  return "리서치";
}

export function ReportsPage() {
  const navigate = useNavigate();
  const { items, isSaved } = useSavedItems();
  const [savedOnly, setSavedOnly] = useState(false);
  const savedCount = items.filter((entry) => entry.kind === "report").length;
  const live = useReports(50);
  const liveReports: ReportListItem[] = live.status === "ready"
    ? live.data.reports.map((r) => ({
        id: r.id,
        source: r.source,
        region: inferRegion(r.source, r.language),
        category: inferCategory(r.category),
        subtype: r.category ?? "리포트",
        title: r.title,
        date: r.published_at,
        pages: 0,
        language: (r.language === "en" ? "en" : "ko") as "ko" | "en",
        summary: "",
        tags: [],
        status: "complete" as const,
        views: "—",
        bookmarks: "—",
      } as ReportListItem))
    : [];
  const base = liveReports.length > 0 ? liveReports : REPORTS;
  const reports = useMemo(
    () => base.filter((report) => !savedOnly || isSaved("report", report.id)),
    [base, isSaved, savedOnly],
  );
  const sourceLabel = live.status === "ready" && liveReports.length > 0
    ? `DB · ${liveReports.length}건`
    : live.status === "loading" ? "DB 로딩 중 · fixture" : "DB 비어있음 · fixture";

  return (
    <PageContainer
      eyebrow="Reports"
      title="리포트"
      description={sourceLabel}
      actions={
        <div className={styles.pageActions}>
          <button
            type="button"
            className={savedOnly ? styles.savedToggleActive : styles.savedToggle}
            onClick={() => setSavedOnly((value) => !value)}
          >
            관심글 {savedCount}
          </button>
        </div>
      }
    >
      <ReportFilters />
      <ReportKpiStrip kpis={REPORT_KPIS} />
      <ReportsTable
        reports={reports}
        onOpenReport={(report) => {
          // For DB rows the route uses the slug fallback resolution in
          // the read endpoint; use id as the URL param.
          navigate(`/reports/${encodeURIComponent(report.id)}`);
        }}
      />
    </PageContainer>
  );
}
