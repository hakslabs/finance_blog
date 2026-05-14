import { Card } from "../../../components/primitives/Card";
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

export function MarketOverviewSection() {
  return (
    <div className={styles.root}>
      <div className={styles.topGrid}>
        <Card title="시장 개요">
          <ChartPlaceholder label="S&P 500 · KOSPI 추이" height={140} />
          <div className={styles.indexRow}>
            {MARKET_INDICES.map((mi, i) => (
              <span key={mi.id} className={styles.indexCell}>
                {i > 0 ? <span className={styles.indexSep} aria-hidden="true">|</span> : null}
                <span>
                  {mi.label} · {mi.value}{" "}
                  <span className={mi.up ? CHANGE_CLASS.up : CHANGE_CLASS.down}>
                    {mi.change}
                  </span>
                </span>
              </span>
            ))}
          </div>
        </Card>

        <Card title="섹터 로테이션 (1M)">
          <DataTable<SectorReturn>
            columns={sectorColumns}
            rows={SECTOR_ROTATION}
            getRowKey={(r) => r.id}
            density="compact"
          />
        </Card>

        <Card title="스타일 로테이션">
          <div className={styles.styleGrid}>
            <div />
            <span className={styles.styleHeader}>대형</span>
            <span className={styles.styleHeader}>소형</span>
            <span className={styles.styleHeader}>그로스</span>
            {STYLE_ROTATION.filter((c) => c.style === "그로스")
              .sort((a) => (a.size === "대형" ? -1 : 1))
              .map((c) => (
                <span
                  key={c.id}
                  className={`${styles.styleCell} ${c.up ? styles.styleCellPos : styles.styleCellNeg}`}
                >
                  {c.value}
                </span>
              ))}
            <span className={styles.styleHeader}>밸류</span>
            {STYLE_ROTATION.filter((c) => c.style === "밸류")
              .sort((a) => (a.size === "대형" ? -1 : 1))
              .map((c) => (
                <span
                  key={c.id}
                  className={`${styles.styleCell} ${c.up ? styles.styleCellPos : styles.styleCellNeg}`}
                >
                  {c.value}
                </span>
              ))}
          </div>
          <p className={styles.styleNote}>이번 분기 대형 그로스 우위</p>
        </Card>
      </div>

      <h2 className={styles.toolsHeading}>분석 도구</h2>
      <div className={styles.toolsGrid}>
        {ANALYSIS_TOOLS.map((tool) => (
          <Card key={tool.id} className={styles.toolCard}>
            <div className={styles.toolIcon} aria-hidden="true">
              {tool.icon}
            </div>
            <div className={styles.toolTitle}>{tool.title}</div>
            <div className={styles.toolDesc}>{tool.description}</div>
            <div className={styles.toolOpen}>열기 →</div>
          </Card>
        ))}
      </div>

      <div className={styles.bottomGrid}>
        <Card
          title="최근 기술적 신호"
          actions={<Badge tone="neutral">관심종목 + 보유종목</Badge>}
        >
          <ul className={styles.signalList}>
            {RECENT_SIGNALS.map((s) => (
              <li key={s.id} className={styles.signalRow}>
                <span
                  className={`${styles.dot} ${DIR_DOT_CLASS[s.direction]}`}
                  aria-hidden="true"
                />
                <span className={styles.signalTicker}>{s.ticker}</span>
                <span className={styles.signalText}>{s.signal}</span>
                <span className={styles.signalTime}>{s.time}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="저장한 스크린">
          <DataTable<SavedScreen>
            columns={screenColumns}
            rows={SAVED_SCREENS}
            getRowKey={(r) => r.id}
            density="compact"
          />
        </Card>
      </div>
    </div>
  );
}
