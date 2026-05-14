import { Badge } from "../../../components/primitives/Badge";
import { Card } from "../../../components/primitives/Card";
import type { ReportDetail, ReportRegion, ReportStatus } from "../../../fixtures/reports";
import styles from "./ReportDetailSections.module.css";

type BadgeTone = "neutral" | "accent" | "positive" | "negative" | "warning";

const REGION_TONE: Record<ReportRegion, BadgeTone> = {
  KR: "positive",
  US: "accent",
  GLOBAL: "neutral",
};

const STATUS_LABEL: Record<ReportStatus, string> = {
  complete: "AI 요약 완료",
  processing: "처리중",
};

export function ReportDetailHeader({ report }: { report: ReportDetail }) {
  return (
    <Card>
      <div className={styles.header}>
        <div className={styles.cover} aria-hidden="true">
          PDF
        </div>
        <div className={styles.headerBody}>
          <div className={styles.badgeRow}>
            <Badge tone={REGION_TONE[report.region]}>{report.region}</Badge>
            <Badge tone="neutral">{report.category}</Badge>
            <Badge tone="neutral">{report.subtype}</Badge>
            <Badge tone={report.status === "complete" ? "accent" : "neutral"}>
              {STATUS_LABEL[report.status]}
            </Badge>
          </div>
          <p className={styles.headerTitle}>{report.title}</p>
          <p className={styles.headerMeta}>
            {report.source} · {report.department} · {report.date} 발간 · {report.pages}페이지
          </p>
          <div className={styles.actions}>
            <button type="button">북마크</button>
            <button type="button">원문 PDF 열기</button>
            <button type="button">메모 추가</button>
            <span>
              조회 {report.views}회 · 북마크 {report.bookmarks}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
