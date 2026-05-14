import { Card } from "../../../components/primitives/Card";
import type { Benchmark, PerformanceMetric } from "../../../fixtures/portfolio";
import styles from "./PerformanceSummary.module.css";

type BenchmarkTone = "portfolio" | "muted";

const BENCH_TONE: Record<BenchmarkTone, string> = {
  portfolio: styles.benchPortfolio,
  muted: styles.benchMuted,
};

const METRIC_SENTIMENT: Record<"pos" | "neg" | "neutral", string> = {
  pos: styles.metricPositive,
  neg: styles.metricNegative,
  neutral: styles.metricNeutral,
};

function metricSentimentClass(positive?: boolean): string {
  if (positive === true) return METRIC_SENTIMENT.pos;
  if (positive === false) return METRIC_SENTIMENT.neg;
  return METRIC_SENTIMENT.neutral;
}

export function PerformanceSummary({
  benchmarks,
  metrics,
}: {
  benchmarks: Benchmark[];
  metrics: PerformanceMetric[];
}) {
  const benchTone = (id: string): BenchmarkTone =>
    id === "bench-portfolio" ? "portfolio" : "muted";

  return (
    <Card title="성과 vs 벤치마크" className={styles.card}>
      <div className={styles.legend}>
        {benchmarks.map((b) => (
          <span key={b.id} className={BENCH_TONE[benchTone(b.id)]}>
            <span className={styles.swatch} aria-hidden="true" />
            {b.label} {b.return}
          </span>
        ))}
      </div>

      <div className={styles.metrics}>
        {metrics.map((m) => (
          <div key={m.id} className={styles.metric}>
            <span className={styles.metricLabel}>{m.label}</span>
            <span className={metricSentimentClass(m.positive)}>{m.value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
