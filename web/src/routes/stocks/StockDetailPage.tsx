import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { PageContainer } from "../../components/layout/PageContainer";
import { Card } from "../../components/primitives/Card";
import { Badge } from "../../components/primitives/Badge";
import { EmptyState } from "../../components/primitives/EmptyState";
import type { StockDetail, StockTab } from "../../fixtures/stocks";
import { getStockDetail, STOCK_TABS } from "../../fixtures/stocks";
import { OverviewSection } from "./sections/OverviewSection";
import { ChartSection } from "./sections/ChartSection";
import { FinancialsSection } from "./sections/FinancialsSection";
import { ValuationSection } from "./sections/ValuationSection";
import { FilingsSection } from "./sections/FilingsSection";
import { NewsSection } from "./sections/NewsSection";
import { SupplyDemandSection } from "./sections/SupplyDemandSection";
import { ConsensusSection } from "./sections/ConsensusSection";
import styles from "./StockDetailPage.module.css";

/** Render the active tab's section component for a given StockDetail. */
function TabContent({ detail, tab }: { detail: StockDetail; tab: StockTab }) {
  switch (tab) {
    case "개요":
      return <OverviewSection detail={detail} />;
    case "차트":
      return <ChartSection detail={detail} />;
    case "재무":
      return (
        <FinancialsSection
          incomeStatement={detail.incomeStatement}
          balanceSheet={detail.balanceSheet}
          cashFlow={detail.cashFlow}
          keyRatios={detail.keyRatios}
        />
      );
    case "밸류에이션":
      return (
        <ValuationSection
          metrics={detail.valuationMetrics}
          peers={detail.peerComparison}
          fairValues={detail.fairValueEstimates}
        />
      );
    case "공시·실적":
      return (
        <FilingsSection filings={detail.filings} nextEarnings={detail.nextEarnings} />
      );
    case "뉴스":
      return <NewsSection news={detail.news} />;
    case "수급":
      return (
        <SupplyDemandSection
          kpis={detail.supplyKpis}
          holders={detail.institutionalHolders}
          insiders={detail.insiderTrades}
        />
      );
    case "컨센서스":
      return (
        <ConsensusSection
          consensus={detail.consensus}
          reports={detail.analystReports}
          gurus={detail.guruHoldings}
        />
      );
    default:
      return null;
  }
}

/** Key stats strip rendered above the tab area. */
function KeyStatsStrip({ detail }: { detail: StockDetail }) {
  const {
    marketCap,
    volume,
    week52Range,
    per,
    pbr,
    roe,
    dividendYield,
    beta,
  } = detail.keyStats;

  const stats: [string, string][] = [
    ["시가총액", marketCap],
    ["거래량", volume],
    ["52W 고/저", week52Range],
    ["PER", per],
    ["PBR", pbr],
    ["ROE", roe],
    ["배당수익률", dividendYield],
    ["베타", beta],
  ];

  return (
    <Card className={styles.statsStrip}>
      <div className={styles.statsRow}>
        {stats.map((kv) => (
          <div key={kv[0]} className={styles.statCell}>
            <p className={styles.statLabel}>{kv[0]}</p>
            <p className={styles.statValue}>{kv[1]}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Similar stocks sidebar. */
function SimilarStocksSidebar({
  detail,
}: {
  detail: StockDetail;
}) {
  return (
    <aside className={styles.sidebar}>
      <Card title="유사 종목" eyebrow="섹터 · 상관계수">
        <div className={styles.similarList}>
          {detail.similarStocks.map((s) => (
            <div key={s.id} className={styles.similarRow}>
              <div>
                <span className={styles.similarSymbol}>
                  {s.symbol}
                </span>
                <span className={styles.similarSector}>상관 {s.correlation}</span>
              </div>
              <span
                className={`${s.up ? styles.changePos : styles.changeNeg} ${styles.similarChange}`}
              >
                {s.change}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="섹터 평균 대비">
        <div className={styles.sectorAvgList}>
          {[
            ["PER", detail.keyStats.per, "34.2"],
            ["PBR", detail.keyStats.pbr, "14.6"],
            ["ROE", detail.keyStats.roe, "42.8%"],
            ["배당률", detail.keyStats.dividendYield, "1.2%"],
          ].map(([label, value, avg]) => (
            <div key={label} className={styles.sectorAvgItem}>
              <div>
                <span>{label}</span>
                <span className={styles.sectorAvgValue}>{value}</span>
              </div>
              <span className={styles.sectorAvgLabel}>섹터 평균 {avg}</span>
            </div>
          ))}
        </div>
      </Card>
    </aside>
  );
}

export function StockDetailPage() {
  const { symbol } = useParams<{ symbol: string }>();
  const rawSymbol = symbol ?? "";
  const displaySymbol = rawSymbol.toUpperCase();
  const [activeTab, setActiveTab] = useState<StockTab>("개요");

  const detail = getStockDetail(rawSymbol);

  // Unknown symbol → empty state with link back to /stocks
  if (!detail) {
    return (
      <PageContainer
        eyebrow="Stock Detail"
        title={`${displaySymbol} 종목 상세`}
      >
        <EmptyState
          title="종목을 찾을 수 없습니다"
          description={`"${displaySymbol}"에 대한 정보가 아직 준비되지 않았습니다.`}
          action={<Link to="/stocks">종목 목록으로 돌아가기</Link>}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      eyebrow="리서치 / 종목"
      title={`${detail.name}`}
      description={
        <span className={styles.descriptionRow}>
          <Badge tone="accent">{detail.symbol}</Badge>
          <Badge tone="neutral">{detail.exchange}</Badge>
          <Badge tone="neutral">{detail.sector}</Badge>
          <span
            className={`${detail.up ? styles.changePos : styles.changeNeg} ${styles.descriptionChange}`}
          >
            {detail.price} {detail.change} ({detail.changePercent})
          </span>
          <span className={styles.descriptionTime}>
            {detail.lastUpdated}
          </span>
        </span>
      }
    >
      <KeyStatsStrip detail={detail} />

      <div className={styles.layout}>
        {/* Main content area with tabs */}
        <main className={styles.main}>
          {/* Tab bar */}
          <nav className={styles.tabBar} aria-label="종목 상세 탭">
            {STOCK_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                className={`${styles.tab} ${
                  activeTab === tab ? styles.tabActive : ""
                }`}
                onClick={() => setActiveTab(tab)}
                aria-pressed={activeTab === tab}
              >
                {tab}
              </button>
            ))}
          </nav>

          {/* Tab content */}
          <section aria-label={`${activeTab} 탭`}>
            <TabContent detail={detail} tab={activeTab} />
          </section>
        </main>

        {/* Right sidebar */}
        <SimilarStocksSidebar detail={detail} />
      </div>
    </PageContainer>
  );
}
