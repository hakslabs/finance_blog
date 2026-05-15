import { Card } from "../../../components/primitives/Card";
import type { RelatedReport, RelatedTicker, ReportDetail } from "../../../fixtures/reports";
import styles from "./ReportDetailSections.module.css";

export function ReportSideRail({
  report,
  onOpenTicker,
  onOpenRelatedReport,
  onOpenMemo,
}: {
  report: ReportDetail;
  onOpenTicker?: (ticker: RelatedTicker) => void;
  onOpenRelatedReport?: (report: RelatedReport) => void;
  onOpenMemo?: () => void;
}) {
  return (
    <aside className={styles.sideRail}>
      <Card title="관련 종목" eyebrow="AI 자동 태깅">
        <div className={styles.tickerList}>
          {report.relatedTickers.map((ticker) => (
            <button
              key={ticker.id}
              type="button"
              className={styles.tickerRow}
              onClick={() => onOpenTicker?.(ticker)}
            >
              <span>{ticker.symbol}</span>
              <span>{ticker.name}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card title="태그">
        <div className={styles.tagList}>
          {report.tags.map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
        </div>
      </Card>

      <Card title="관련 리포트">
        <div className={styles.relatedList}>
          {report.relatedReports.map((related) => (
            <button
              key={related.id}
              type="button"
              className={styles.relatedItem}
              onClick={() => onOpenRelatedReport?.(related)}
            >
              <span>{related.title}</span>
              <span>{related.date}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card title="내 메모">
        <button type="button" className={styles.memoBox} onClick={onOpenMemo}>
          {report.memoPrompt}
        </button>
      </Card>
    </aside>
  );
}
