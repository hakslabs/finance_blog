import { Card } from "../../../components/primitives/Card";
import { ChartPlaceholder } from "../../../components/primitives/ChartPlaceholder";
import { Badge } from "../../../components/primitives/Badge";
import type { FilingItem, EarningsEvent } from "../../../fixtures/stocks";
import { useStockFilings } from "../../../lib/useStockExtras";
import styles from "./FilingsSection.module.css";

const FILING_TONE_CLASS: Record<FilingItem["tone"], string> = {
  up: styles.up,
  down: styles.down,
  neutral: styles.neutral,
};

type FilingsSectionProps = {
  symbol: string;
  filings: FilingItem[];
  nextEarnings: EarningsEvent;
  onOpenFiling?: (filing: FilingItem) => void;
};

export function FilingsSection({ symbol, filings, nextEarnings, onOpenFiling }: FilingsSectionProps) {
  const live = useStockFilings(symbol, 25);
  const liveItems: FilingItem[] =
    live.status === "ready"
      ? live.data.items.map((f) => ({
          id: f.accession,
          date: f.filed_at ?? "",
          formType: f.form,
          title: f.description || f.form,
          priceImpact: "—",
          tone: "neutral" as const,
        }))
      : [];
  const items = liveItems.length > 0 ? liveItems : filings;
  const sourceLabel =
    live.status === "ready" && liveItems.length > 0
      ? `SEC EDGAR · ${live.data.cik ? `CIK ${live.data.cik}` : "라이브"} · ${liveItems.length}건`
      : live.status === "loading"
        ? "EDGAR 로딩 중 · fixture 표시"
        : live.status === "error"
          ? "EDGAR 오류 · fixture 표시"
          : "EDGAR 미지원 심볼 · fixture 표시";

  return (
    <div className={styles.container}>
      <div className={styles.filingsGrid}>
        <Card title="실적 발표 트렌드" eyebrow="20분기">
          <ChartPlaceholder label="실적 서프라이즈 트렌드" height={180} />
        </Card>

        <Card title="다음 실적 발표">
          <div className={styles.nextEarnings}>
            <div className={styles.earnRow}>
              <span className={styles.earnLabel}>예정일</span>
              <span className={styles.earnValue}>{nextEarnings.date}</span>
            </div>
            <div className={styles.earnRow}>
              <span className={styles.earnLabel}>분기</span>
              <span className={styles.earnValue}>{nextEarnings.quarter}</span>
            </div>
            <div className={styles.earnRow}>
              <span className={styles.earnLabel}>시점</span>
              <span className={styles.earnValue}>{nextEarnings.timing}</span>
            </div>
            <div className={styles.earnDivider} />
            <p className={styles.earnSectionTitle}>
              컨센서스 추정
            </p>
            <div className={styles.earnRow}>
              <span className={styles.earnLabel}>매출</span>
              <span className={styles.earnValue}>
                {nextEarnings.consensusRevenue}
              </span>
            </div>
            <div className={styles.earnRow}>
              <span className={styles.earnLabel}>EPS</span>
              <span className={styles.earnValue}>
                {nextEarnings.consensusEps}
              </span>
            </div>
            <div className={styles.earnRow}>
              <span className={styles.earnLabel}>영업이익률</span>
              <span className={styles.earnValue}>
                {nextEarnings.consensusOpMargin}
              </span>
            </div>
          </div>
        </Card>
      </div>

      <Card title="공시 타임라인" eyebrow="EDGAR / DART">
        <div className={styles.filingList}>
          {items.map((f) => (
            <button
              key={f.id}
              type="button"
              className={styles.filingRow}
              onClick={() => onOpenFiling?.(f)}
            >
              <span className={styles.filingDate}>{f.date}</span>
              <span className={styles.filingTitle}>
                <Badge tone="neutral">{f.formType}</Badge>
                {f.title}
              </span>
              <span
                className={`${styles.filingImpact} ${FILING_TONE_CLASS[f.tone]}`}
              >
                {f.priceImpact}
              </span>
            </button>
          ))}
        </div>
        <p className={styles.sourceNote}>출처: {sourceLabel}</p>
      </Card>
    </div>
  );
}
