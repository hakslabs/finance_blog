import { Link, useParams } from "react-router-dom";
import { PageContainer } from "../../components/layout/PageContainer";
import { ActionNotice } from "../../components/interaction/ActionNotice";
import { DetailPanel } from "../../components/interaction/DetailPanel";
import { EmptyState } from "../../components/primitives/EmptyState";
import { useInteractionActions } from "../../lib/interaction/useInteractionActions";
import { useReport } from "../../lib/useReport";
import { getReport } from "../../fixtures/reports";
import { ReportBody } from "./sections/ReportBody";
import { ReportDetailHeader } from "./sections/ReportDetailHeader";
import { ReportSideRail } from "./sections/ReportSideRail";
import { ReportSummary } from "./sections/ReportSummary";
import { ReportToc } from "./sections/ReportToc";
import styles from "./ReportDetailPage.module.css";

export function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const fixtureReport = getReport(id);
  const dbState = useReport(id);
  const { detail, notice, handleAction, closeDetail } = useInteractionActions();

  const dbReport = dbState.status === "ready" ? dbState.report : null;
  const report = fixtureReport
    ? {
        ...fixtureReport,
        title: dbReport?.title ?? fixtureReport.title,
        source: dbReport?.source ?? fixtureReport.source,
        date: dbReport?.published_at ?? fixtureReport.date,
        language:
          dbReport && (dbReport.language === "ko" || dbReport.language === "en")
            ? (dbReport.language as "ko" | "en")
            : fixtureReport.language,
      }
    : null;
  const sourceLabel =
    dbState.status === "ready"
      ? "Supabase · 라이브"
      : dbState.status === "loading"
        ? "DB 로딩 중 · fixture 표시"
        : dbState.status === "not-found"
          ? "DB 미수록 · fixture 표시"
          : "API 오류 · fixture 표시";

  if (!report) {
    return (
      <PageContainer eyebrow="Report Detail" title="리포트를 찾을 수 없습니다">
        <EmptyState
          title="리포트 정보가 없습니다"
          description={`"${id ?? "unknown"}"에 대한 리포트 fixture가 아직 준비되지 않았습니다.`}
          action={<Link to="/reports">리포트 목록으로 돌아가기</Link>}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      eyebrow="리포트 / 상세"
      title={report.title}
      description={`${report.source} · ${report.department} · ${report.date} 발간 · ${report.pages}페이지 · ${report.language.toUpperCase()} · ${sourceLabel}`}
    >
      <Link to="/reports" className={styles.backLink}>← 리포트 목록으로</Link>

      <ReportDetailHeader report={report} />
      <ReportSummary report={report} />

      <div className={styles.layout}>
        <ReportToc items={report.toc} />
        <ReportBody report={report} />
        <ReportSideRail
          report={report}
          onOpenTicker={(ticker) =>
            handleAction({
              type: "detail",
              detail: {
                id: `report-ticker-${ticker.id}`,
                eyebrow: "관련 종목",
                title: `${ticker.symbol} · ${ticker.name}`,
                summary: "이 리포트에서 자동 태깅된 관련 종목입니다.",
                sections: [
                  {
                    title: "다음 연결",
                    body: "종목 상세, 리포트 문단 근거, 내 메모 연결은 리포트 RAG/태깅 PR에서 확장됩니다.",
                  },
                ],
              },
            })
          }
          onOpenRelatedReport={(related) =>
            handleAction({ type: "route", to: `/reports/${encodeURIComponent(related.id)}` })
          }
          onOpenMemo={() =>
            handleAction({
              type: "planned",
              message: "리포트 메모 저장은 PR-19 메모/Thesis 저장에서 연결됩니다.",
            })
          }
        />
      </div>
      <DetailPanel detail={detail} onClose={closeDetail} />
      <ActionNotice message={notice} />
    </PageContainer>
  );
}
