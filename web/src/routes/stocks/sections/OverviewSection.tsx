import { Card } from "../../../components/primitives/Card";
import { ChartPlaceholder } from "../../../components/primitives/ChartPlaceholder";
import { PriceChart } from "../../../components/primitives/PriceChart";
import type { StockDetail, TechnicalSignal } from "../../../fixtures/stocks";
import { useQuote } from "../../../lib/useQuote";
import { useStockProfile } from "../../../lib/useStockExtras";
import styles from "./OverviewSection.module.css";

const SIGNAL_TONE_CLASS: Record<TechnicalSignal["tone"], string> = {
  positive: styles.dotPositive,
  neutral: styles.dotNeutral,
  negative: styles.dotNegative,
};

const SIGNAL_VALUE_CLASS: Record<TechnicalSignal["tone"], string> = {
  positive: styles.positive,
  neutral: styles.neutral,
  negative: styles.negative,
};

type OverviewSectionProps = {
  detail: StockDetail;
};

export function OverviewSection({ detail }: OverviewSectionProps) {
  const { companyOverview, sectorPosition, technicalSignals, keyStats } = detail;
  const quote = useQuote(detail.symbol, "1y");
  const profile = useStockProfile(detail.symbol);
  const livePro = profile.status === "ready" ? profile.data.profile : null;
  const liveCO = livePro
    ? {
        description: companyOverview.description,
        headquarters: livePro.country ?? companyOverview.headquarters,
        founded: livePro.ipo ? Number(livePro.ipo.slice(0, 4)) || companyOverview.founded : companyOverview.founded,
        ceo: companyOverview.ceo,
        employees: companyOverview.employees,
        fiscalYearEnd: companyOverview.fiscalYearEnd,
        industry: livePro.industry ?? null,
        exchange: livePro.exchange ?? null,
        weburl: livePro.weburl ?? null,
      }
    : { ...companyOverview, industry: null as string | null, exchange: null as string | null, weburl: null as string | null };

  return (
    <div className={styles.grid}>
      {/* Price chart area */}
      <Card title="가격 · 1년 추이" eyebrow="일별 종가">
        {quote.status === "ready" && quote.quote.bars.length > 0 ? (
          <PriceChart bars={quote.quote.bars} height={200} ariaLabel={`${detail.symbol} 1Y 가격 차트`} />
        ) : (
          <ChartPlaceholder label={`${detail.symbol} 1Y 가격 차트`} height={200} />
        )}
      </Card>

      {/* Right column: key stats + signals */}
      <div className={styles.rightCol}>
        <Card title="핵심 지표">
          <div className={styles.statsGrid}>
            {[
              ["PER", keyStats.per],
              ["PBR", keyStats.pbr],
              ["ROE", keyStats.roe],
              ["배당수익률", keyStats.dividendYield],
              ["시가총액", keyStats.marketCap],
              ["52주 고/저", keyStats.week52Range],
              ["베타", keyStats.beta],
              ["거래량", keyStats.volume],
            ].map(([label, value]) => (
              <div key={String(label)} className={styles.statItem}>
                <p className={styles.statLabel}>{label}</p>
                <p className={styles.statValue}>{value}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card title="기술 신호" eyebrow="자체 계산 · 참고용">
          <div className={styles.signalList}>
            {technicalSignals.map((s) => (
              <div key={s.id} className={styles.signalRow}>
                <span>
                  <span
                    className={`${styles.signalDot} ${SIGNAL_TONE_CLASS[s.tone]}`}
                    aria-hidden="true"
                  />
                  {s.label}
                </span>
                <span
                  className={`${styles.signalValue} ${SIGNAL_VALUE_CLASS[s.tone]}`}
                >
                  {s.value}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Company overview */}
      <Card title="기업 개요" eyebrow={livePro ? "Finnhub · 라이브" : "fixture"}>
        <p className={styles.overviewText}>
          {liveCO.description}
          <br />
          <br />
          <strong>본사</strong> {liveCO.headquarters} · <strong>설립</strong> {liveCO.founded}
          <br />
          <strong>CEO</strong> {liveCO.ceo} · <strong>직원</strong> {liveCO.employees}
          <br />
          <strong>회계연도 마감</strong> {liveCO.fiscalYearEnd}
          {liveCO.industry ? (<><br/><strong>섹터</strong> {liveCO.industry}{liveCO.exchange ? ` · ${liveCO.exchange}` : ""}</>) : null}
          {liveCO.weburl ? (<><br/><strong>웹</strong> <a href={liveCO.weburl} target="_blank" rel="noreferrer">{liveCO.weburl}</a></>) : null}
        </p>
      </Card>

      {/* Sector position */}
      <Card title="섹터 내 위치" eyebrow={detail.sector}>
        <div className={styles.positionList}>
          {sectorPosition.map((sp) => (
            <div key={sp.label} className={styles.positionRow}>
              <span>{sp.label}</span>
              <span className={styles.positionValue}>{sp.value}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
