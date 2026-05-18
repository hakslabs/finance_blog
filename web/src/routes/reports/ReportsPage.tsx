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
  const liveKpis = live.status === "ready"
    ? (() => {
        const rs = live.data.reports;
        const total = rs.length;
        const sources = new Set(rs.map((r) => r.source)).size;
        const recentDays = 14;
        const cutoff = new Date(Date.now() - recentDays * 86400000);
        const recent = rs.filter((r) => new Date(r.published_at) >= cutoff).length;
        const ko = rs.filter((r) => r.language === "ko").length;
        return [
          { id: "total", label: "총 보고서", value: `${total}`, detail: `${sources}개 소스` },
          { id: "new", label: `최근 ${recentDays}일 신규`, value: `+${recent}`, detail: "DB 기준" },
          { id: "sources", label: "활성 소스", value: `${sources}`, detail: "공공·SEC·증권사" },
          { id: "lang", label: "국문 비중", value: total ? `${Math.round((ko / total) * 100)}%` : "—", detail: `${ko}/${total}` },
        ];
      })()
    : null;
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
      <ReportKpiStrip kpis={liveKpis ?? REPORT_KPIS} />
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
