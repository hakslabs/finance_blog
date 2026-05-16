import { Card } from "../../../components/primitives/Card";
import { Badge } from "../../../components/primitives/Badge";
import { ChartPlaceholder } from "../../../components/primitives/ChartPlaceholder";
import type {
  ConsensusSummary,
  AnalystReport,
  GuruHolding,
} from "../../../fixtures/stocks";
import { useStockConsensus } from "../../../lib/useStockExtras";
import styles from "./ConsensusSection.module.css";

const GURU_TONE_CLASS: Record<GuruHolding["tone"], string> = {
  positive: styles.positive,
  neutral: styles.neutral,
  negative: styles.negative,
};

type OpinionKey = "strongBuy" | "buy" | "hold" | "sell" | "strongSell";

type OpinionRow = readonly [label: string, count: number, key: OpinionKey];

const FALLBACK_OPINION_ROWS: readonly OpinionRow[] = [
  ["강력 매수", 28, "strongBuy"],
  ["매수", 13, "buy"],
  ["보유", 9, "hold"],
  ["매도", 1, "sell"],
  ["강력 매도", 1, "strongSell"],
];

const OPINION_FILL_CLASS: Record<OpinionKey, string> = {
  strongBuy: styles.fillStrongBuy,
  buy: styles.fillBuy,
  hold: styles.fillHold,
  sell: styles.fillSell,
  strongSell: styles.fillStrongSell,
};

type ConsensusSectionProps = {
  symbol: string;
  consensus: ConsensusSummary;
  reports: AnalystReport[];
  gurus: GuruHolding[];
};

export function ConsensusSection({
  symbol,
  consensus,
  reports,
  gurus,
}: ConsensusSectionProps) {
  const live = useStockConsensus(symbol);
  const liveRec = live.status === "ready" ? live.data.recommendations[0] : null;
  const opinionRows: readonly OpinionRow[] = liveRec
    ? ([
        ["강력 매수", liveRec.strong_buy, "strongBuy"],
        ["매수", liveRec.buy, "buy"],
        ["보유", liveRec.hold, "hold"],
        ["매도", liveRec.sell, "sell"],
        ["강력 매도", liveRec.strong_sell, "strongSell"],
      ] as const)
    : FALLBACK_OPINION_ROWS;
  const livePT = live.status === "ready" ? live.data.price_target : null;
  const targetMean = livePT?.target_mean != null ? `$${livePT.target_mean.toFixed(2)}` : consensus.targetMean;
  const analystCount = livePT?.number_of_analysts != null ? `${livePT.number_of_analysts}명` : consensus.analystCount;
  const sourceLabel =
    live.status === "ready" && (liveRec || livePT)
      ? `Finnhub · ${liveRec?.period ?? livePT?.last_updated ?? "라이브"}`
      : live.status === "loading"
        ? "Finnhub 로딩 중 · fixture 표시"
        : live.status === "error"
          ? "Finnhub 오류 · fixture 표시"
          : "Finnhub 빈 결과 · fixture 표시";
  return (
    <div className={styles.container}>
      {/* KPI row */}
      <div className={styles.consensusKpiGrid}>
        <Card>
          <p className={styles.kpiLabel}>평균 의견</p>
          <p className={`${styles.kpiValue} ${styles.positive}`}>
            {consensus.rating}
          </p>
          <p className={styles.kpiDetail}>{consensus.analystCount}</p>
        </Card>
        <Card>
          <p className={styles.kpiLabel}>목표주가 평균</p>
          <p className={styles.kpiValue}>{targetMean}</p>
        </Card>
        <Card>
          <p className={styles.kpiLabel}>상승여력</p>
          <p className={`${styles.kpiValue} ${styles.positive}`}>
            {consensus.upsidePotential}
          </p>
        </Card>
        <Card>
          <p className={styles.kpiLabel}>커버 애널리스트</p>
          <p className={styles.kpiValue}>{analystCount}</p>
        </Card>
      </div>

      <p className={styles.sourceNote}>출처: {sourceLabel}</p>

      {/* Target distribution + Opinion distribution */}
      <div className={styles.conGrid}>
        <Card title="목표가 분포">
          <ChartPlaceholder label="목표가 분포 히스토그램" height={160} />
          <div className={styles.targetRange}>
            <span>$160</span>
            <span className={styles.targetCurrent}>현재가 $184.32</span>
            <span>$280</span>
          </div>
        </Card>

        <Card title="의견 분포">
          <div className={styles.opinionList}>
            {opinionRows.map(([label, count, key]) => (
              <div key={String(label)} className={styles.opinionRow}>
                <div className={styles.opinionHeader}>
                  <span>{label}</span>
                  <span className={styles.opinionCount}>{count}명</span>
                </div>
                <div className={styles.opinionBar}>
                  <div className={`${styles.opinionFill} ${OPINION_FILL_CLASS[key]}`} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Analyst reports */}
      <Card title="최근 애널리스트 리포트" eyebrow="30일">
        <table className={styles.reportTable}>
          <thead>
            <tr>
              <th>날짜</th>
              <th>증권사 / 애널리스트</th>
              <th>의견 변경</th>
              <th>이전 목표가</th>
              <th>신규 목표가</th>
              <th>핵심 코멘트</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id}>
                <td>{r.date}</td>
                <td>{r.firm}</td>
                <td>
                  <Badge tone="neutral">{r.opinionChange}</Badge>
                </td>
                <td className={styles.faintCell}>{r.prevTarget}</td>
                <td>{r.newTarget}</td>
                <td className={styles.commentCell}>{r.comment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Guru holdings */}
      <Card title="이 종목을 보유한 고수" eyebrow="13F · 분기">
        <div className={styles.guruGrid}>
          {gurus.map((g) => (
            <Card key={g.id} className={styles.guruCard}>
              <p className={styles.guruName}>{g.name}</p>
              <p className={styles.guruFirm}>{g.firm}</p>
              <div className={styles.guruFooter}>
                <span>{g.weight}</span>
                <span className={GURU_TONE_CLASS[g.tone]}>{g.activity}</span>
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}
