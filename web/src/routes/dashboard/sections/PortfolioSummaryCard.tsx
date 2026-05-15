import { Card } from "../../../components/primitives/Card";
import type {
  PortfolioAsset,
  TopHolding,
} from "../../../fixtures/dashboard";
import styles from "./PortfolioSummaryCard.module.css";

const DONUT_R = 52;
const DONUT_CX = 65;
const DONUT_CY = 65;

function donutSegments(assets: PortfolioAsset[]): { d: string; fill: string; key: string }[] {
  let acc = -90;
  return assets.map((s) => {
    const a1 = (acc * Math.PI) / 180;
    const a2 = ((acc + s.percent * 3.6) * Math.PI) / 180;
    acc += s.percent * 3.6;
    const large = s.percent > 50 ? 1 : 0;
    const x1 = DONUT_CX + DONUT_R * Math.cos(a1);
    const y1 = DONUT_CY + DONUT_R * Math.sin(a1);
    const x2 = DONUT_CX + DONUT_R * Math.cos(a2);
    const y2 = DONUT_CY + DONUT_R * Math.sin(a2);
    return {
      d: `M ${DONUT_CX} ${DONUT_CY} L ${x1} ${y1} A ${DONUT_R} ${DONUT_R} 0 ${large} 1 ${x2} ${y2} Z`,
      fill: s.color,
      key: s.label,
    };
  });
}

export function PortfolioSummaryCard({
  assets,
  holdings,
  totalAssetsShort,
  onOpenAsset,
  onOpenHolding,
  onOpenPortfolio,
}: {
  assets: PortfolioAsset[];
  holdings: TopHolding[];
  totalAssetsShort: string;
  onOpenAsset?: (asset: PortfolioAsset) => void;
  onOpenHolding?: (holding: TopHolding) => void;
  onOpenPortfolio?: () => void;
}) {
  const segments = donutSegments(assets);
  const maxWeight = holdings.reduce((m, h) => Math.max(m, h.weight), 0) || 1;

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>포트폴리오 구성</h2>
        <span className={styles.subtitle}>국가 · 섹터 · 보유</span>
      </div>
      <div className={styles.rule} />
      <div className={styles.layout}>
        <button
          type="button"
          className={styles.donutWrap}
          onClick={onOpenPortfolio}
          aria-label="포트폴리오 구성 상세"
        >
          <svg
            width="130"
            height="130"
            viewBox="0 0 130 130"
            aria-label="포트폴리오 구성 도넛"
          >
            {segments.map((seg) => (
              <path key={seg.key} d={seg.d} fill={seg.fill} />
            ))}
            <circle cx={DONUT_CX} cy={DONUT_CY} r="32" className={styles.donutHole} />
          </svg>
          <div className={styles.donutCenter}>
            <span className={styles.donutCenterLabel}>총 자산</span>
            <span className={styles.donutCenterValue}>{totalAssetsShort}</span>
          </div>
        </button>
        <div className={styles.compositionLegend}>
          {assets.map((s) => (
            <button
              type="button"
              key={s.label}
              className={styles.legendRow}
              onClick={() => onOpenAsset?.(s)}
            >
              <span
                className={styles.legendSwatch}
                style={{ background: s.color }}
              />
              <span className={styles.legendRowLabel}>{s.label}</span>
              <span className={styles.legendPercent}>{s.percent}%</span>
              <span className={styles.legendAmount}>₩{s.amount}</span>
            </button>
          ))}
        </div>
      </div>
      <div className={styles.rule} />
      <div className={styles.holdingsSection}>
        <div className={styles.holdingsHeader}>
          <span className={styles.holdingsTitle}>
            상위 보유 ({holdings.length})
          </span>
          <span className={styles.holdingsSubtitle}>비중 순</span>
        </div>
        {holdings.map((h) => (
          <button
            type="button"
            key={h.symbol}
            className={styles.holdingRow}
            onClick={() => onOpenHolding?.(h)}
          >
            <span className={styles.holdingSymbol}>{h.symbol}</span>
            <span className={styles.holdingName}>{h.name}</span>
            <div className={styles.weightBarOuter}>
              <div
                className={styles.weightBarInner}
                style={{ width: `${(h.weight / maxWeight) * 100}%` }}
              />
            </div>
            <span className={styles.holdingWeight}>{h.weight}%</span>
            <span
              className={h.up ? styles.holdingChangePos : styles.holdingChangeNeg}
            >
              {h.change}
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
}
