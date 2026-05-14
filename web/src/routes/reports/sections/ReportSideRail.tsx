import { Card } from "../../../components/primitives/Card";
import type { ReportDetail } from "../../../fixtures/reports";
import styles from "./ReportDetailSections.module.css";

export function ReportSideRail({ report }: { report: ReportDetail }) {
  return (
    <aside className={styles.sideRail}>
      <Card title="관련 종목" eyebrow="AI 자동 태깅">
        <div className={styles.tickerList}>
          {report.relatedTickers.map((ticker) => (
            <div key={ticker.id} className={styles.tickerRow}>
              <span>{ticker.symbol}</span>
              <span>{ticker.name}</span>
            </div>
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
            <div key={related.id} className={styles.relatedItem}>
              <span>{related.title}</span>
              <span>{related.date}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="내 메모">
        <div className={styles.memoBox}>{report.memoPrompt}</div>
      </Card>
    </aside>
  );
}
