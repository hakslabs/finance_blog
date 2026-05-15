import { Card } from "../../../components/primitives/Card";
import { Section } from "../../../components/primitives/Section";
import { ChartPlaceholder } from "../../../components/primitives/ChartPlaceholder";
import {
  DataTable,
  type DataTableColumn,
} from "../../../components/primitives/DataTable";
import { Badge } from "../../../components/primitives/Badge";
import {
  MARKET_INDICES,
  SECTOR_ROTATION,
  STYLE_ROTATION,
  ANALYSIS_TOOLS,
  RECENT_SIGNALS,
  SAVED_SCREENS,
  type SectorReturn,
  type RecentSignal,
  type SavedScreen,
  type MarketIndex,
  type StyleCell,
  type AnalysisTab,
  type AnalysisTool,
} from "../../../fixtures/analysis";
import styles from "./MarketOverviewSection.module.css";

const CHANGE_CLASS = {
  up: styles.changePos,
  down: styles.changeNeg,
  neutral: styles.changeNeutral,
} as const;

const DIR_DOT_CLASS: Record<RecentSignal["direction"], string> = {
  up: styles.dotUp,
  down: styles.dotDown,
  neutral: styles.dotNeutral,
};

const STYLE_GROWTH = STYLE_ROTATION.filter((c) => c.style === "그로스");
const STYLE_VALUE = STYLE_ROTATION.filter((c) => c.style === "밸류");

const sectorColumns: DataTableColumn<SectorReturn>[] = [
  { key: "sector", header: "섹터", render: (r) => r.sector },
  {
    key: "return",
    header: "1M 수익률",
    align: "right",
    render: (r) => (
      <span className={r.up ? CHANGE_CLASS.up : CHANGE_CLASS.down}>
        {r.return > 0 ? "+" : ""}
        {r.return}%
      </span>
    ),
  },
];

const signalColumns: DataTableColumn<RecentSignal>[] = [
  {
    key: "ticker",
    header: "종목",
    render: (r) => (
      <span className={styles.signalTickerCell}>
        <span
          className={`${styles.dot} ${DIR_DOT_CLASS[r.direction]}`}
          aria-hidden="true"
        />
        <span className={styles.signalTicker}>{r.ticker}</span>
      </span>
    ),
  },
  { key: "signal", header: "신호", render: (r) => r.signal },
  {
    key: "time",
    header: "시각",
    align: "right",
    render: (r) => <span className={styles.signalTime}>{r.time}</span>,
  },
];

const screenColumns: DataTableColumn<SavedScreen>[] = [
  {
    key: "name",
    header: "스크린",
    render: (r) => (
      <span className={styles.screenName}>
        <span className={styles.screenTitle}>{r.name}</span>
        <span className={styles.screenDesc}>{r.description}</span>
      </span>
    ),
  },
  {
    key: "matches",
    header: "결과",
    align: "right",
    render: (r) => <span className={styles.screenCount}>{r.matches}건</span>,
  },
];

export function MarketOverviewSection({
  onOpenTool,
  onSelectToolTab,
  onOpenIndex,
  onOpenSector,
  onOpenStyle,
  onOpenSignal,
  onOpenScreen,
  onOpenChart,
}: {
  onOpenTool?: (tool: AnalysisTool) => void;
  onSelectToolTab?: (tab: AnalysisTab) => void;
  onOpenIndex?: (row: MarketIndex) => void;
  onOpenSector?: (row: SectorReturn) => void;
  onOpenStyle?: (row: StyleCell) => void;
  onOpenSignal?: (row: RecentSignal) => void;
  onOpenScreen?: (row: SavedScreen) => void;
  onOpenChart?: (label: string) => void;
}) {
  return (
    <div className={styles.root}>
      <div className={styles.topGrid}>
        <Card title="시장 개요">
          <ChartPlaceholder
            label="S&P 500 · KOSPI 추이"
            height={140}
            onOpen={() => onOpenChart?.("S&P 500 · KOSPI 추이")}
          />
          <div className={styles.indexRow}>
            {MARKET_INDICES.map((mi, i) => (
              <button
                type="button"
                key={mi.id}
                className={styles.indexCell}
                onClick={() => onOpenIndex?.(mi)}
              >
                {i > 0 ? <span className={styles.indexSep} aria-hidden="true">|</span> : null}
                <span>
                  {mi.label} · {mi.value}{" "}
                  <span className={mi.up ? CHANGE_CLASS.up : CHANGE_CLASS.down}>
                    {mi.change}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </Card>

        <Card title="섹터 로테이션 (1M)">
          <DataTable<SectorReturn>
            columns={sectorColumns}
            rows={SECTOR_ROTATION}
            getRowKey={(r) => r.id}
            density="compact"
            onRowClick={onOpenSector}
            getRowAriaLabel={(r) => `${r.sector} 섹터 로테이션 상세`}
          />
        </Card>

        <Card title="스타일 로테이션">
          <div className={styles.styleGrid}>
            <div />
            <span className={styles.styleHeader}>대형</span>
            <span className={styles.styleHeader}>소형</span>
            <span className={styles.styleHeader}>그로스</span>
            {STYLE_GROWTH.map((c) => (
              <button
                type="button"
                key={c.id}
                className={`${styles.styleCell} ${c.up ? styles.styleCellPos : styles.styleCellNeg}`}
                onClick={() => onOpenStyle?.(c)}
              >
                {c.value}
              </button>
            ))}
            <span className={styles.styleHeader}>밸류</span>
            {STYLE_VALUE.map((c) => (
              <button
                type="button"
                key={c.id}
                className={`${styles.styleCell} ${c.up ? styles.styleCellPos : styles.styleCellNeg}`}
                onClick={() => onOpenStyle?.(c)}
              >
                {c.value}
              </button>
            ))}
          </div>
          <p className={styles.styleNote}>이번 분기 대형 그로스 우위</p>
        </Card>
      </div>

      <Section title="분석 도구">
        <div className={styles.toolsGrid}>
          {ANALYSIS_TOOLS.map((tool) => (
            <Card key={tool.id} className={styles.toolCard}>
              <div className={styles.toolIcon} aria-hidden="true">
                {tool.icon}
              </div>
              <div className={styles.toolTitle}>{tool.title}</div>
              <div className={styles.toolDesc}>{tool.description}</div>
              <div className={styles.toolActions}>
                <button type="button" onClick={() => onSelectToolTab?.(tool.targetTab)}>
                  도구 열기
                </button>
                <button type="button" onClick={() => onOpenTool?.(tool)}>
                  상세
                </button>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <div className={styles.bottomGrid}>
        <Card
          title="최근 기술적 신호"
          actions={<Badge tone="neutral">관심종목 + 보유종목</Badge>}
        >
          <DataTable<RecentSignal>
            columns={signalColumns}
            rows={RECENT_SIGNALS}
            getRowKey={(r) => r.id}
            density="compact"
            onRowClick={onOpenSignal}
            getRowAriaLabel={(r) => `${r.ticker} 최근 신호 상세`}
          />
        </Card>

        <Card title="저장한 스크린">
          <DataTable<SavedScreen>
            columns={screenColumns}
            rows={SAVED_SCREENS}
            getRowKey={(r) => r.id}
            density="compact"
            onRowClick={onOpenScreen}
            getRowAriaLabel={(r) => `${r.name} 저장 스크린 상세`}
          />
        </Card>
      </div>
    </div>
  );
}
