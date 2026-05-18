import { Card } from "../../../components/primitives/Card";
import { Badge } from "../../../components/primitives/Badge";
import { ChartPlaceholder } from "../../../components/primitives/ChartPlaceholder";
import {
  DataTable,
  type DataTableColumn,
} from "../../../components/primitives/DataTable";
import { useFearGreed } from "../../../lib/useDashboardLive";
import {
  SENTIMENT_INDICATORS,
  INDICATOR_GLOSSARY,
  type SentimentIndicator,
  type SentimentStatus,
  type IndicatorGlossary,
} from "../../../fixtures/analysis";
import styles from "./SentimentSection.module.css";

const STATUS_TONE: Record<
  SentimentStatus,
  "positive" | "accent" | "neutral" | "warning" | "negative"
> = {
  calm: "positive",
  stable: "accent",
  neutral: "neutral",
  caution: "warning",
  stress: "warning",
  panic: "negative",
};

const indicatorColumns: DataTableColumn<SentimentIndicator>[] = [
  {
    key: "label",
    header: "지표",
    render: (r) => (
      <span className={styles.cellLabel}>
        <span className={styles.labelName}>{r.label}</span>
        <span className={styles.labelDesc}>{r.description}</span>
      </span>
    ),
  },
  {
    key: "value",
    header: "값",
    align: "right",
    render: (r) => <span className={styles.mono}>{r.value}</span>,
  },
  {
    key: "status",
    header: "상태",
    align: "right",
    render: (r) => <Badge tone={STATUS_TONE[r.status]}>{r.statusLabel}</Badge>,
  },
];

const glossaryColumns: DataTableColumn<IndicatorGlossary>[] = [
  {
    key: "term",
    header: "용어",
    render: (r) => <span className={styles.mono}>{r.term}</span>,
  },
  { key: "desc", header: "설명", render: (r) => r.description },
];

const REGION_LABEL: Record<SentimentIndicator["region"], string> = {
  US: "🇺🇸 미국 시장",
  KR: "🇰🇷 한국 시장",
  Global: "🌐 글로벌 거시",
};

function regionRows(region: SentimentIndicator["region"]): SentimentIndicator[] {
  return SENTIMENT_INDICATORS.filter((s) => s.region === region);
}

function fgBand(v: number): { status: SentimentIndicator["status"]; label: string } {
  if (v >= 75) return { status: "stress", label: "Extreme Greed" };
  if (v >= 55) return { status: "caution", label: "Greed" };
  if (v >= 45) return { status: "neutral", label: "Neutral" };
  if (v >= 25) return { status: "stable", label: "Fear" };
  return { status: "panic", label: "Extreme Fear" };
}

export function SentimentSection({
  onOpenIndicator,
  onOpenGlossary,
  onOpenChart,
}: {
  onOpenIndicator?: (row: SentimentIndicator) => void;
  onOpenGlossary?: (row: IndicatorGlossary) => void;
  onOpenChart?: (label: string) => void;
}) {
  const regions: SentimentIndicator["region"][] = ["US", "KR", "Global"];
  const fg = useFearGreed();
  const liveUsRow: SentimentIndicator | null = fg.status === "ready" && fg.data.items.length > 0
    ? (() => {
        const it = fg.data.items[0];
        if (it.value == null) return null;
        const band = fgBand(it.value);
        return {
          id: "live-cnn-fg",
          region: "US" as const,
          label: "CNN Fear & Greed",
          description: it.label ?? "CNN 공포·탐욕 지수",
          value: `${Math.round(it.value)}`,
          status: band.status,
          statusLabel: band.label,
        };
      })()
    : null;
  const rowsFor = (region: SentimentIndicator["region"]): SentimentIndicator[] => {
    const base = regionRows(region);
    if (region === "US" && liveUsRow) return [liveUsRow, ...base];
    return base;
  };

  return (
    <div className={styles.root}>
      <Card>
        <p className={styles.banner}>
          시장 전반의 과열·공포 정도를 미국·한국·글로벌 9개 지표로 진단합니다.
          상태 색상이 진할수록 극단값입니다.{" "}
          <span className={styles.bannerMeta}>· 갱신 14:32</span>
        </p>
      </Card>

      <div className={styles.regionGrid}>
        {regions.map((region) => (
          <Card key={region} title={REGION_LABEL[region]}>
            <DataTable<SentimentIndicator>
              columns={indicatorColumns}
              rows={rowsFor(region)}
              getRowKey={(r) => r.id}
              density="compact"
              onRowClick={onOpenIndicator}
              getRowAriaLabel={(r) => `${r.label} 심리 지표 상세`}
            />
          </Card>
        ))}
      </div>

      <div className={styles.bottomGrid}>
        <Card title="종합 심리 지수 · 12개월 추이">
          <ChartPlaceholder
            label="US · KR · Global 합성 심리 추이"
            height={140}
            onOpen={() => onOpenChart?.("US · KR · Global 합성 심리 추이")}
          />
          <div className={styles.legendRow}>
            <span className={styles.legendItem}>
              <span className={`${styles.legendSwatch} ${styles.swatchDown}`} aria-hidden="true" />
              극공포 (0–25)
            </span>
            <span className={styles.legendItem}>
              <span className={`${styles.legendSwatch} ${styles.swatchNeutral}`} aria-hidden="true" />
              중립 (45–55)
            </span>
            <span className={styles.legendItem}>
              <span className={`${styles.legendSwatch} ${styles.swatchUp}`} aria-hidden="true" />
              극탐욕 (75+)
            </span>
          </div>
        </Card>

        <Card title="지표 해설">
          <DataTable<IndicatorGlossary>
            columns={glossaryColumns}
            rows={INDICATOR_GLOSSARY}
            getRowKey={(r) => r.id}
            density="compact"
            onRowClick={onOpenGlossary}
            getRowAriaLabel={(r) => `${r.term} 지표 해설 상세`}
          />
        </Card>
      </div>
    </div>
  );
}
