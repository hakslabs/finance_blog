import { KpiTile } from "../../../components/primitives/KpiTile";
import type { PortfolioKpi } from "../../../fixtures/portfolio";
import styles from "./KpiStrip.module.css";

const SENTIMENT_CLASS: Record<"pos" | "neg" | "neutral", string> = {
  pos: styles.positive,
  neg: styles.negative,
  neutral: "",
};

function sentimentClass(positive?: boolean): string {
  if (positive === true) return SENTIMENT_CLASS.pos;
  if (positive === false) return SENTIMENT_CLASS.neg;
  return SENTIMENT_CLASS.neutral;
}

export function KpiStrip({ kpis }: { kpis: PortfolioKpi[] }) {
  return (
    <section className={styles.strip} aria-label="포트폴리오 요약">
      {kpis.map((kpi) => (
        <div key={kpi.id} className={styles.item}>
          <KpiTile
            label={kpi.label}
            value={kpi.value}
            detail={kpi.detail}
            trend={
              kpi.positive !== undefined && kpi.detail !== undefined ? (
                <span className={sentimentClass(kpi.positive)}>
                  {kpi.positive ? "\u2191" : "\u2193"}
                </span>
              ) : undefined
            }
          />
        </div>
      ))}
    </section>
  );
}
