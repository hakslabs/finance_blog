import { Card } from "../../../components/primitives/Card";
import { KpiTile } from "../../../components/primitives/KpiTile";
import type { ReportDetail } from "../../../fixtures/reports";
import styles from "./ReportDetailSections.module.css";

export function ReportSummary({ report }: { report: ReportDetail }) {
  return (
    <Card
      title="AI 요약"
      eyebrow={report.model}
      actions={
        <span className={styles.summaryMeta}>
          {report.tokenCount} 토큰 · 처리 {report.processingTime}
        </span>
      }
      className={styles.summaryCard}
    >
      <p className={styles.summaryText}>{report.aiSummary}</p>
      <div className={styles.detailKpis}>
        <KpiTile label="조회" value={report.views} detail="누적 조회" />
        <KpiTile label="북마크" value={report.bookmarks} detail="저장한 사용자" />
        <KpiTile label="페이지" value={`${report.pages}p`} detail={report.language.toUpperCase()} />
      </div>
      <p className={styles.blockLabel}>핵심 포인트</p>
      <ul className={styles.pointList}>
        {report.keyPoints.map((point) => (
          <li key={point.id}>{point.text}</li>
        ))}
      </ul>
    </Card>
  );
}
