import { useState } from "react";
import { PageContainer } from "../../components/layout/PageContainer";
import { ActionNotice } from "../../components/interaction/ActionNotice";
import { DetailPanel } from "../../components/interaction/DetailPanel";
import { useInteractionActions } from "../../lib/interaction/useInteractionActions";
import { ANALYSIS_TABS, type AnalysisTab, type AnalysisTool } from "../../fixtures/analysis";
import { MarketOverviewSection } from "./sections/MarketOverviewSection";
import { SentimentSection } from "./sections/SentimentSection";
import { TechnicalSection } from "./sections/TechnicalSection";
import { FinancialAnalysisSection } from "./sections/FinancialAnalysisSection";
import { QuantFactorSection } from "./sections/QuantFactorSection";
import { DcfSection } from "./sections/DcfSection";
import { SectorFlowSection } from "./sections/SectorFlowSection";
import { SignalsSection } from "./sections/SignalsSection";
import styles from "./AnalysisPage.module.css";

function toolDetail(tool: AnalysisTool) {
  return {
    id: tool.id,
    eyebrow: `Analysis tool · ${tool.targetTab}`,
    title: tool.title,
    summary: tool.description,
    tags: [tool.targetTab],
    sections: tool.detailSections,
  };
}

function TabContent({
  tab,
  onOpenTool,
  onSelectToolTab,
}: {
  tab: AnalysisTab;
  onOpenTool: (tool: AnalysisTool) => void;
  onSelectToolTab: (tab: AnalysisTab) => void;
}) {
  switch (tab) {
    case "시장 한눈에":
      return (
        <MarketOverviewSection
          onOpenTool={onOpenTool}
          onSelectToolTab={onSelectToolTab}
        />
      );
    case "시장 심리":
      return <SentimentSection />;
    case "기술적 분석":
      return <TechnicalSection />;
    case "재무 분석":
      return <FinancialAnalysisSection />;
    case "퀀트 팩터":
      return <QuantFactorSection />;
    case "적정주가 계산":
      return <DcfSection />;
    case "섹터 흐름":
      return <SectorFlowSection />;
    case "신호 알림":
      return <SignalsSection />;
    default:
      return null;
  }
}

export function AnalysisPage() {
  const [activeTab, setActiveTab] = useState<AnalysisTab>("시장 한눈에");
  const { detail, notice, handleAction, closeDetail } = useInteractionActions();

  return (
    <PageContainer
      eyebrow="Analysis"
      title="분석"
      description="시장 한눈에 · 심리 · 기술적 · 재무 · 퀀트 팩터 · 적정주가 — 모든 분석 도구의 진입점"
    >
      <nav className={styles.tabBar} aria-label="분석 탭">
        {ANALYSIS_TABS.map((tab) => (
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

      <section aria-label={`${activeTab} 탭`}>
        <TabContent
          tab={activeTab}
          onOpenTool={(tool) => handleAction({ type: "detail", detail: toolDetail(tool) })}
          onSelectToolTab={setActiveTab}
        />
      </section>
      <DetailPanel detail={detail} onClose={closeDetail} />
      <ActionNotice message={notice} />
    </PageContainer>
  );
}
