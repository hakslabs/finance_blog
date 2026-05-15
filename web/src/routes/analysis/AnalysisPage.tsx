import { useState } from "react";
import { PageContainer } from "../../components/layout/PageContainer";
import { ActionNotice } from "../../components/interaction/ActionNotice";
import { DetailPanel } from "../../components/interaction/DetailPanel";
import { useInteractionActions } from "../../lib/interaction/useInteractionActions";
import {
  ANALYSIS_TABS,
  type AnalysisTab,
  type AnalysisTool,
  type DcfAssumption,
  type FinancialScore,
  type IndicatorGlossary,
  type QuantFactor,
  type SectorMomentum,
  type SentimentIndicator,
  type SignalAlert,
  type TechnicalIndicator,
} from "../../fixtures/analysis";
import type { DetailContent } from "../../lib/interaction/action-intent";
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

function rowDetail(kind: string, row: Record<string, unknown>): DetailContent {
  const title =
    String(row.title ?? row.symbol ?? row.ticker ?? row.factor ?? row.sector ?? row.label ?? row.term ?? kind);
  const summary =
    String(row.description ?? row.signal ?? row.type ?? row.detail ?? "선택한 항목의 분석 상세입니다.");
  return {
    id: `${kind}-${String(row.id ?? title)}`,
    eyebrow: kind,
    title,
    meta: String(row.value ?? row.score ?? row.spread ?? row.time ?? ""),
    tags: Object.entries(row)
      .filter(([key, value]) => ["region", "statusLabel", "signalLabel", "trendLabel", "direction", "score"].includes(key) && value)
      .map(([, value]) => String(value)),
    summary,
    sections: [
      {
        title: "화면 값",
        body: "현재 표에 표시된 핵심 값입니다.",
        items: Object.entries(row)
          .filter(([, value]) => typeof value === "string" || typeof value === "number")
          .slice(0, 8)
          .map(([key, value]) => `${key}: ${String(value)}`),
      },
      {
        title: "다음 연결",
        body: "실제 계산식, 저장한 조건, 알림 설정은 후속 데이터/저장 PR에서 같은 상세 패널 안으로 연결됩니다.",
      },
    ],
  };
}

function TabContent({
  tab,
  onOpenTool,
  onSelectToolTab,
  onOpenDetail,
}: {
  tab: AnalysisTab;
  onOpenTool: (tool: AnalysisTool) => void;
  onSelectToolTab: (tab: AnalysisTab) => void;
  onOpenDetail: (detail: DetailContent) => void;
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
      return (
        <SentimentSection
          onOpenIndicator={(row: SentimentIndicator) => onOpenDetail(rowDetail("시장 심리 지표", row))}
          onOpenGlossary={(row: IndicatorGlossary) => onOpenDetail(rowDetail("지표 해설", row))}
        />
      );
    case "기술적 분석":
      return <TechnicalSection onOpenIndicator={(row: TechnicalIndicator) => onOpenDetail(rowDetail("기술적 분석", row))} />;
    case "재무 분석":
      return <FinancialAnalysisSection onOpenScore={(row: FinancialScore) => onOpenDetail(rowDetail("재무 분석", row))} />;
    case "퀀트 팩터":
      return <QuantFactorSection onOpenFactor={(row: QuantFactor) => onOpenDetail(rowDetail("퀀트 팩터", row))} />;
    case "적정주가 계산":
      return <DcfSection onOpenAssumption={(row: DcfAssumption) => onOpenDetail(rowDetail("DCF 가정", row))} />;
    case "섹터 흐름":
      return <SectorFlowSection onOpenSector={(row: SectorMomentum) => onOpenDetail(rowDetail("섹터 흐름", row))} />;
    case "신호 알림":
      return <SignalsSection onOpenAlert={(row: SignalAlert) => onOpenDetail(rowDetail("신호 알림", row))} />;
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
          onOpenDetail={(selectedDetail) => handleAction({ type: "detail", detail: selectedDetail })}
        />
      </section>
      <DetailPanel detail={detail} onClose={closeDetail} />
      <ActionNotice message={notice} />
    </PageContainer>
  );
}
