import { Card } from "../../../components/primitives/Card";
import { Badge } from "../../../components/primitives/Badge";
import type { NewsItem } from "../../../fixtures/stocks";
import { useStockNews } from "../../../lib/useStockExtras";
import styles from "./NewsSection.module.css";

type NewsSectionProps = {
  news: NewsItem[];
  symbol: string;
  onOpenNews?: (news: NewsItem) => void;
};

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const mins = Math.floor((Date.now() - t) / 60000);
  if (mins < 60) return `${Math.max(mins, 0)}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  const days = Math.floor(hrs / 24);
  return `${days}일 전`;
}

export function NewsSection({ news, symbol, onOpenNews }: NewsSectionProps) {
  const live = useStockNews(symbol, 14);
  const liveItems: NewsItem[] =
    live.status === "ready"
      ? live.data.items.map((n) => ({
          id: n.id,
          timeAgo: timeAgo(n.datetime),
          source: n.source ?? "",
          title: n.headline,
          summary: n.summary ?? "",
        }))
      : [];
  const items = liveItems.length > 0 ? liveItems : news;
  const sourceLabel =
    live.status === "ready" && liveItems.length > 0
      ? `Finnhub · 최근 14일 ${liveItems.length}건`
      : live.status === "loading"
        ? "Finnhub 로딩 중 · fixture 표시"
        : live.status === "error"
          ? `Finnhub 오류 · fixture 표시`
          : "Finnhub 빈 결과 · fixture 표시";

  return (
    <div className={styles.container}>
      <div className={styles.filterRow}>
        <span className={`${styles.filterPill} ${styles.filterActive}`}>
          전체 ({items.length})
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
          {items.map((n) => (
            <button
              key={n.id}
              type="button"
              className={styles.newsCardButton}
              onClick={() => onOpenNews?.(n)}
            >
              <div className={styles.newsMeta}>
                <span className={styles.newsTime}>{n.timeAgo}</span>
                <Badge tone="neutral">{n.source}</Badge>
              </div>
              <p className={styles.newsTitle}>{n.title}</p>
              <p className={styles.newsSummary}>{n.summary}</p>
            </button>
          ))}
        </div>

        <div className={styles.newsSidebar}>
          <Card className={styles.summaryCard}>
            <p className={styles.summaryText}>
              최근 뉴스 {items.length}건 표시. 핵심 키워드 분석 자동화는 후속 PR.
            </p>
            <p className={styles.summarySource}>출처: {sourceLabel}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
