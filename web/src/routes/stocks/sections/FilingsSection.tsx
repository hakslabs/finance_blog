import { Card } from "../../../components/primitives/Card";
import { ChartPlaceholder } from "../../../components/primitives/ChartPlaceholder";
import { Badge } from "../../../components/primitives/Badge";
import type { FilingItem, EarningsEvent } from "../../../fixtures/stocks";
import styles from "./FilingsSection.module.css";

const FILING_TONE_CLASS: Record<FilingItem["tone"], string> = {
  up: styles.up,
  down: styles.down,
  neutral: styles.neutral,
};

type FilingsSectionProps = {
  filings: FilingItem[];
  nextEarnings: EarningsEvent;
};

export function FilingsSection({ filings, nextEarnings }: FilingsSectionProps) {
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
          {filings.map((f) => (
            <div key={f.id} className={styles.filingRow}>
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
            </div>
          ))}
        </div>
        <p className={styles.sourceNote}>
          출처: SEC EDGAR · 갱신 매일 18:00
        </p>
      </Card>
    </div>
  );
}
