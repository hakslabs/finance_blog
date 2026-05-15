import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { PageContainer } from "../../components/layout/PageContainer";
import { ActionNotice } from "../../components/interaction/ActionNotice";
import { DetailPanel } from "../../components/interaction/DetailPanel";
import { Card } from "../../components/primitives/Card";
import { Badge } from "../../components/primitives/Badge";
import { EmptyState } from "../../components/primitives/EmptyState";
import { useInteractionActions } from "../../lib/interaction/useInteractionActions";
import type { FilingItem, NewsItem, StockDetail, StockTab } from "../../fixtures/stocks";
import { getStockDetail, STOCK_TABS } from "../../fixtures/stocks";
import {
  FED_RATE_PROBABILITIES,
  MARKET_INDICES,
  RECENT_SIGNALS,
  SENTIMENT_INDICATORS,
} from "../../fixtures/analysis";
import type { DetailContent } from "../../lib/interaction/action-intent";
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
function stockNewsDetail(news: NewsItem, symbol: string) {
  return {
    id: news.id,
    eyebrow: `${symbol} News · ${news.source}`,
    title: news.title,
    meta: news.timeAgo,
    summary: news.summary,
    sections: [
      {
        title: "다음 연결",
        body: "원문 링크, 뉴스 저장, 내 해석 메모는 저장/메모 PR에서 연결됩니다.",
      },
    ],
  };
}

function filingDetail(filing: FilingItem, symbol: string) {
  return {
    id: filing.id,
    eyebrow: `${symbol} Filing · ${filing.formType}`,
    title: filing.title,
    meta: `${filing.date} · 가격 영향 ${filing.priceImpact}`,
    summary: "공시 요약, 원문 링크, 내 메모를 한 패널에서 볼 수 있도록 연결하는 상세 보기입니다.",
  };
}

function stockAnalysisDetail(symbol: string): DetailContent {
  const matchingSignals = RECENT_SIGNALS.filter((signal) => signal.ticker === symbol).slice(0, 3);
  const sentiment = SENTIMENT_INDICATORS.slice(0, 3);
  const rate = FED_RATE_PROBABILITIES[2];

  return {
    id: `stock-analysis-${symbol}`,
    eyebrow: `${symbol} Analysis snapshot`,
    title: `${symbol} 종목 분석 요약`,
    summary: "시장, 심리, 기술 신호, 금리 확률을 종목 상세에서 한 번에 훑는 요약입니다.",
    tags: ["시장", "심리", "기술", "금리"],
    sections: [
      {
        title: "시장 배경",
        body: "종목 수익률을 해석하기 전에 먼저 확인할 주요 시장 지표입니다.",
        items: MARKET_INDICES.slice(0, 5).map((index) => `${index.label}: ${index.value} (${index.change})`),
      },
      {
        title: "심리 상태",
        body: "미국/한국/글로벌 심리 지표의 현재 상태입니다.",
        items: sentiment.map((item) => `${item.label}: ${item.value} · ${item.statusLabel}`),
      },
      {
        title: "종목 신호",
        body: matchingSignals.length > 0 ? "현재 종목에 직접 연결된 기술 신호입니다." : "현재 fixture에는 직접 연결된 기술 신호가 없어 관심종목 신호를 참고합니다.",
        items: (matchingSignals.length > 0 ? matchingSignals : RECENT_SIGNALS.slice(0, 3)).map((signal) => `${signal.ticker}: ${signal.signal} · ${signal.time}`),
      },
      {
        title: "금리 경로",
        body: `${rate.meeting} 기준 인하 확률 ${rate.cutProbability}%, 동결 ${rate.holdProbability}%, 예상 금리 ${rate.expectedRate}.`,
      },
    ],
  };
}

function TabContent({
  detail,
  tab,
  onOpenNews,
  onOpenFiling,
}: {
  detail: StockDetail;
  tab: StockTab;
  onOpenNews: (news: NewsItem) => void;
  onOpenFiling: (filing: FilingItem) => void;
}) {
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
        <FilingsSection
          filings={detail.filings}
          nextEarnings={detail.nextEarnings}
          onOpenFiling={onOpenFiling}
        />
      );
    case "뉴스":
      return <NewsSection news={detail.news} onOpenNews={onOpenNews} />;
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
  onOpenAnalysis,
}: {
  detail: StockDetail;
  onOpenAnalysis: () => void;
}) {
  return (
    <aside className={styles.sidebar}>
      <Card
        title="종목 분석 한눈에"
        eyebrow="Market + sentiment + rates"
        actions={<Link to="/analysis" className={styles.cardLink}>분석 열기</Link>}
      >
        <button type="button" className={styles.analysisSnapshot} onClick={onOpenAnalysis}>
          <span>
            <strong>시장지표</strong>
            <small>{MARKET_INDICES.slice(0, 3).map((index) => index.label).join(" · ")}</small>
          </span>
          <span>
            <strong>심리</strong>
            <small>{SENTIMENT_INDICATORS[1].label} {SENTIMENT_INDICATORS[1].value} · {SENTIMENT_INDICATORS[1].statusLabel}</small>
          </span>
          <span>
            <strong>금리</strong>
            <small>{FED_RATE_PROBABILITIES[2].meeting} 인하 {FED_RATE_PROBABILITIES[2].cutProbability}%</small>
          </span>
          <span>
            <strong>신호</strong>
            <small>{RECENT_SIGNALS.find((signal) => signal.ticker === detail.symbol)?.signal ?? "관심종목 신호 확인"}</small>
          </span>
        </button>
      </Card>

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
  const { detail: panelDetail, notice, handleAction, closeDetail } = useInteractionActions();

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
      <Link to="/stocks" className={styles.backLink}>← 종목 목록으로</Link>

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
            <TabContent
              detail={detail}
              tab={activeTab}
              onOpenNews={(news) => handleAction({ type: "detail", detail: stockNewsDetail(news, detail.symbol) })}
              onOpenFiling={(filing) => handleAction({ type: "detail", detail: filingDetail(filing, detail.symbol) })}
            />
          </section>
        </main>

        {/* Right sidebar */}
        <SimilarStocksSidebar
          detail={detail}
          onOpenAnalysis={() => handleAction({ type: "detail", detail: stockAnalysisDetail(detail.symbol) })}
        />
      </div>
      <DetailPanel detail={panelDetail} onClose={closeDetail} />
      <ActionNotice message={notice} />
    </PageContainer>
  );
}
