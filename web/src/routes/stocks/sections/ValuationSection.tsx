import { Card } from "../../../components/primitives/Card";
import { ChartPlaceholder } from "../../../components/primitives/ChartPlaceholder";
import type {
  ValuationMetric,
  FairValueEstimate,
  PeerComparison,
} from "../../../fixtures/stocks";
import styles from "./ValuationSection.module.css";

const METRIC_TONE_CLASS: Record<ValuationMetric["tone"], string> = {
  positive: styles.positive,
  neutral: styles.neutral,
  negative: styles.negative,
};

const FV_TONE_CLASS: Record<FairValueEstimate["tone"], string> = {
  positive: styles.positive,
  neutral: styles.neutral,
  negative: styles.negative,
};

type ValuationSectionProps = {
  metrics: ValuationMetric[];
  peers: PeerComparison[];
  fairValues: FairValueEstimate[];
};

function MetricCards({ metrics }: { metrics: ValuationMetric[] }) {
  return (
    <div className={styles.metricCards}>
      {metrics.map((m) => (
        <Card key={m.id}>
          <p className={styles.metricLabel}>{m.label}</p>
          <p className={styles.metricValue}>{m.value}</p>
          <p className={`${styles.metricContext} ${METRIC_TONE_CLASS[m.tone]}`}>
            {m.context}
          </p>
        </Card>
      ))}
    </div>
  );
}

function PeerTable({ peers }: { peers: PeerComparison[] }) {
  return (
    <table className={styles.peerTable}>
      <thead>
        <tr>
          <th>종목</th>
          <th>시총</th>
          <th>PER</th>
          <th>PBR</th>
          <th>ROE</th>
          <th>매출성장</th>
          <th>영업이익률</th>
        </tr>
      </thead>
      <tbody>
        {peers.map((p) => (
          <tr
            key={p.id}
            className={
              p.isHighlight
                ? styles.highlightRow
                : p.isMedian
                  ? styles.medianRow
                  : ""
            }
          >
            <td>{p.symbol ? `${p.symbol} · ${p.name}` : p.name}</td>
            <td>{p.marketCap}</td>
            <td>{p.per}</td>
            <td>{p.pbr}</td>
            <td>{p.roe}</td>
            <td>{p.revenueGrowth}</td>
            <td>{p.opMargin}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FairValueList({ estimates }: { estimates: FairValueEstimate[] }) {
  return (
    <div className={styles.fvList}>
      {estimates.map((fv) => (
        <div key={fv.id} className={styles.fvRow}>
          <span className={styles.fvMethod}>{fv.method}</span>
          <span>
            <span className={styles.fvPrice}>{fv.fairPrice}</span>
            <span className={`${styles.fvPremium} ${FV_TONE_CLASS[fv.tone]}`}>
              {fv.premium}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

export function ValuationSection({
  metrics,
  peers,
  fairValues,
}: ValuationSectionProps) {
  return (
    <div className={styles.container}>
      <MetricCards metrics={metrics} />

      <div className={styles.valGrid}>
        <Card title="PER · PBR 5년 추이">
          <ChartPlaceholder label="배수 추이 차트" height={180} />
          <p className={styles.trendNote}>
            현재 PER {metrics[0]?.value} · 5년 평균 26배
          </p>
        </Card>

        <Card title="적정주가 추정">
          <FairValueList estimates={fairValues} />
        </Card>
      </div>

      <Card title="동종업계 비교" eyebrow={peers[0]?.isHighlight ? "기술 섹터" : undefined}>
        <PeerTable peers={peers} />
      </Card>
    </div>
  );
}
