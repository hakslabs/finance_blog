import { Link, useParams } from "react-router-dom";
import { PageContainer } from "../../components/layout/PageContainer";
import { EmptyState } from "../../components/primitives/EmptyState";
import { getReport } from "../../fixtures/reports";
import { ReportBody } from "./sections/ReportBody";
import { ReportDetailHeader } from "./sections/ReportDetailHeader";
import { ReportSideRail } from "./sections/ReportSideRail";
import { ReportSummary } from "./sections/ReportSummary";
import { ReportToc } from "./sections/ReportToc";
import styles from "./ReportDetailPage.module.css";

export function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const report = getReport(id);

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
      description={`${report.source} · ${report.department} · ${report.date} 발간 · ${report.pages}페이지 · ${report.language.toUpperCase()}`}
    >
      <Link to="/reports" className={styles.backLink}>← 리포트 목록으로</Link>

      <ReportDetailHeader report={report} />
      <ReportSummary report={report} />

      <div className={styles.layout}>
        <ReportToc items={report.toc} />
        <ReportBody report={report} />
        <ReportSideRail report={report} />
      </div>
    </PageContainer>
  );
}
