import { Card } from "../../../components/primitives/Card";
import { Badge } from "../../../components/primitives/Badge";
import type { NewsItem } from "../../../fixtures/stocks";
import styles from "./NewsSection.module.css";

type NewsSectionProps = {
  news: NewsItem[];
};

export function NewsSection({ news }: NewsSectionProps) {
  return (
    <div className={styles.container}>
      <div className={styles.filterRow}>
        <span className={`${styles.filterPill} ${styles.filterActive}`}>
          전체 ({news.length})
        </span>
        <span className={styles.filterPill}>한국어</span>
        <span className={styles.filterPill}>영문</span>
        <span className={styles.divider} aria-hidden="true" />
        <span className={styles.filterPill}>실적</span>
        <span className={styles.filterPill}>제품</span>
        <span className={styles.filterPill}>M&A</span>
        <span className={styles.filterPill}>애널리스트</span>
      </div>

      <div className={styles.newsGrid}>
        <div className={styles.newsList}>
          {news.map((n) => (
            <Card key={n.id} className={styles.newsCard}>
              <div className={styles.newsMeta}>
                <span className={styles.newsTime}>{n.timeAgo}</span>
                <Badge tone="neutral">{n.source}</Badge>
              </div>
              <p className={styles.newsTitle}>{n.title}</p>
              <p className={styles.newsSummary}>{n.summary}</p>
            </Card>
          ))}
        </div>

        <div className={styles.newsSidebar}>
          <Card className={styles.summaryCard}>
            <p className={styles.summaryText}>
              최근 뉴스 {news.length}건 중 긍정적 흐름 우세. 핵심 키워드는{" "}
              <strong>"실적 강세", "자사주 매입", "AI 서비스 확대"</strong>{" "}
              순.
            </p>
            <p className={styles.summarySource}>
              출처: 각사 보도자료 · 수집 자동화 예정
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
