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
  type MarketIndex,
  type QuantFactor,
  type RecentSignal,
  type SavedScreen,
  type SectorReturn,
  type SectorMomentum,
  type SentimentIndicator,
  type SignalAlert,
  type StyleCell,
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

function rowDetail(kind: string, row: object): DetailContent {
  const values = row as Record<string, unknown>;
  const title =
    String(values.title ?? values.symbol ?? values.ticker ?? values.factor ?? values.sector ?? values.label ?? values.term ?? kind);
  const summary =
    String(values.description ?? values.signal ?? values.type ?? values.detail ?? "선택한 항목의 분석 상세입니다.");
  return {
    id: `${kind}-${String(values.id ?? title)}`,
    eyebrow: kind,
    title,
    meta: String(values.value ?? values.score ?? values.spread ?? values.time ?? ""),
    tags: Object.entries(values)
      .filter(([key, value]) => ["region", "statusLabel", "signalLabel", "trendLabel", "direction", "score"].includes(key) && value)
      .map(([, value]) => String(value)),
    summary,
    sections: [
      {
        title: "화면 값",
        body: "현재 표에 표시된 핵심 값입니다.",
        items: Object.entries(values)
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

function chartDetail(label: string, tab: AnalysisTab): DetailContent {
  return {
    id: `analysis-chart-${tab}-${label}`,
    eyebrow: `Analysis chart · ${tab}`,
    title: label,
    summary: "이 차트 블록에서 보여줘야 하는 핵심 시계열과 비교 기준입니다.",
    tags: [tab, "차트"],
    sections: [
      {
        title: "확대 화면",
        body: "선택한 분석 탭의 메인 차트를 확대해서 보고, 기간·시장·비교 대상을 같은 패널에서 바꿀 수 있도록 연결합니다.",
      },
      {
        title: "읽는 순서",
        body: "차트를 볼 때 확인할 기본 순서입니다.",
        items: [
          "현재값과 직전 기간 변화율을 먼저 확인합니다.",
          "같은 시장 안의 비교 대상 또는 벤치마크와 괴리를 봅니다.",
          "극단값이면 관련 표의 세부 항목으로 내려가 원인을 확인합니다.",
        ],
      },
      {
        title: "후속 데이터 연결",
        body: "실제 시계열 API가 붙으면 이 상세 패널이 원본 차트, 다운로드, 알림 조건 저장까지 같은 진입점으로 확장됩니다.",
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
          onOpenIndex={(row: MarketIndex) => onOpenDetail(rowDetail("시장 지수", row))}
          onOpenSector={(row: SectorReturn) => onOpenDetail(rowDetail("섹터 로테이션", row))}
          onOpenStyle={(row: StyleCell) => onOpenDetail(rowDetail("스타일 로테이션", row))}
          onOpenSignal={(row: RecentSignal) => onOpenDetail(rowDetail("최근 기술적 신호", row))}
          onOpenScreen={(row: SavedScreen) => onOpenDetail(rowDetail("저장한 스크린", row))}
          onOpenChart={(label) => onOpenDetail(chartDetail(label, tab))}
        />
      );
    case "시장 심리":
      return (
        <SentimentSection
          onOpenIndicator={(row: SentimentIndicator) => onOpenDetail(rowDetail("시장 심리 지표", row))}
          onOpenGlossary={(row: IndicatorGlossary) => onOpenDetail(rowDetail("지표 해설", row))}
          onOpenChart={(label) => onOpenDetail(chartDetail(label, tab))}
        />
      );
    case "기술적 분석":
      return (
        <TechnicalSection
          onOpenIndicator={(row: TechnicalIndicator) => onOpenDetail(rowDetail("기술적 분석", row))}
          onOpenChart={(label) => onOpenDetail(chartDetail(label, tab))}
        />
      );
    case "재무 분석":
      return (
        <FinancialAnalysisSection
          onOpenScore={(row: FinancialScore) => onOpenDetail(rowDetail("재무 분석", row))}
          onOpenChart={(label) => onOpenDetail(chartDetail(label, tab))}
        />
      );
    case "퀀트 팩터":
      return (
        <QuantFactorSection
          onOpenFactor={(row: QuantFactor) => onOpenDetail(rowDetail("퀀트 팩터", row))}
          onOpenChart={(label) => onOpenDetail(chartDetail(label, tab))}
        />
      );
    case "적정주가 계산":
      return (
        <DcfSection
          onOpenAssumption={(row: DcfAssumption) => onOpenDetail(rowDetail("DCF 가정", row))}
          onOpenChart={(label) => onOpenDetail(chartDetail(label, tab))}
        />
      );
    case "섹터 흐름":
      return (
        <SectorFlowSection
          onOpenSector={(row: SectorMomentum) => onOpenDetail(rowDetail("섹터 흐름", row))}
          onOpenChart={(label) => onOpenDetail(chartDetail(label, tab))}
        />
      );
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
