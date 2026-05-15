import { useState } from "react";
import { FileText, MessageSquarePlus, Star } from "lucide-react";
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
  const [bookmarked, setBookmarked] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  function showPlanned(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2400);
  }

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
            <button
              type="button"
              className={bookmarked ? styles.actionActive : undefined}
              onClick={() => setBookmarked((value) => !value)}
            >
              <Star size={14} aria-hidden="true" fill={bookmarked ? "currentColor" : "none"} />
              {bookmarked ? "관심글" : "관심글 저장"}
            </button>
            <button
              type="button"
              onClick={() => showPlanned("원문 PDF 연결은 리포트 수집 파이프라인에서 활성화됩니다.")}
            >
              <FileText size={14} aria-hidden="true" />
              원문 PDF
            </button>
            <button
              type="button"
              onClick={() => showPlanned("리포트 메모 저장은 PR-19 메모/Thesis 저장에서 연결됩니다.")}
            >
              <MessageSquarePlus size={14} aria-hidden="true" />
              메모 추가
            </button>
            <span>
              조회 {report.views}회 · 북마크 {report.bookmarks}
            </span>
          </div>
          {notice ? <p className={styles.inlineNotice}>{notice}</p> : null}
        </div>
      </div>
    </Card>
  );
}
