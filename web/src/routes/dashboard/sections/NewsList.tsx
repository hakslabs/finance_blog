import { Link } from "react-router-dom";
import { Badge } from "../../../components/primitives/Badge";
import { Card } from "../../../components/primitives/Card";
import type { NewsCategory, NewsItem } from "../../../fixtures/dashboard";
import styles from "./NewsList.module.css";

const CAT_CLASS: Record<NewsCategory, string> = {
  kr: styles.catKr,
  us: styles.catUs,
  macro: styles.catMacro,
};

const CAT_LABEL: Record<NewsCategory, string> = {
  kr: "한국",
  us: "미국",
  macro: "매크로",
};

export function NewsList({
  items,
  onOpenNews,
  onSaveNews,
  onAddNote,
}: {
  items: NewsItem[];
  onOpenNews?: (item: NewsItem) => void;
  onSaveNews?: (item: NewsItem) => void;
  onAddNote?: (item: NewsItem) => void;
}) {
  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <h2 className={styles.title}>시장 핵심 뉴스</h2>
          <span className={styles.subtitle}>
            편집팀 큐레이션 · 매크로 / 한국 / 미국
          </span>
        </div>
        <Badge tone="neutral">최근 6h</Badge>
      </div>
      {items.map((n) => (
        <div key={n.id} className={styles.item}>
          <div className={styles.top}>
            <span className={CAT_CLASS[n.category]}>
              {CAT_LABEL[n.category]}
            </span>
            <div className={styles.body}>
              <button
                type="button"
                className={styles.newsTitleButton}
                onClick={() => onOpenNews?.(n)}
              >
                {n.title}
              </button>
              <div className={styles.meta}>
                {n.source} · {n.timeAgo}
              </div>
            </div>
          </div>
          <div className={styles.bottom}>
            <span className={styles.relatedLabel}>관련:</span>
            {n.relatedSymbols.map((t) => (
              <Link
                key={t}
                className={styles.relatedTicker}
                to={`/stocks/${encodeURIComponent(t)}`}
              >
                {t}
              </Link>
            ))}
            {n.portfolioImpact !== "—" && (
              <span className={styles.impact}>
                · 내 포지션{" "}
                <b className={styles.impactValue}>{n.portfolioImpact}</b>
              </span>
            )}
            <span className={styles.spacer} />
            {n.hasMyNote ? (
              <button
                type="button"
                className={styles.actionHasNote}
                onClick={() => onOpenNews?.(n)}
              >
                ✎ 내 해석 있음 →
              </button>
            ) : (
              <button
                type="button"
                className={styles.actionAddNote}
                onClick={() => onAddNote?.(n)}
              >
                + 해석 추가
              </button>
            )}
            <button
              type="button"
              className={styles.actionSave}
              onClick={() => onSaveNews?.(n)}
            >
              저장
            </button>
          </div>
        </div>
      ))}
      <Link className={styles.footer} to="/reports">리포트 메뉴 →</Link>
    </Card>
  );
}
