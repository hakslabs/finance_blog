import { Card } from "../../../components/primitives/Card";
import type {
  FearGreedData,
  MacroIndicator,
} from "../../../fixtures/dashboard";
import {
  SPARK_MACRO_DOWN,
  SPARK_MACRO_UP,
} from "./sparkline";
import styles from "./IndicatorStrip.module.css";

const FG_BANDS = [
  { to: 25, color: "#c83b3b", label: "Extreme Fear" },
  { to: 45, color: "#d97c41", label: "Fear" },
  { to: 55, color: "#9da1a5", label: "Neutral" },
  { to: 75, color: "#7aa84a", label: "Greed" },
  { to: 100, color: "#1f7a55", label: "Extreme Greed" },
] as const;

type FgBand = { from: number; to: number; color: string; label: string };

const FG_SEGMENTS: FgBand[] = FG_BANDS.map((b, idx) => ({
  from: idx === 0 ? 0 : FG_BANDS[idx - 1].to,
  to: b.to,
  color: b.color,
  label: b.label,
}));

function fgArc(
  from: number,
  to: number,
  cx: number,
  cy: number,
  r: number
): string {
  const a1 = Math.PI - (from / 100) * Math.PI;
  const a2 = Math.PI - (to / 100) * Math.PI;
  return `M ${cx + r * Math.cos(a1)} ${cy - r * Math.sin(a1)} A ${r} ${r} 0 0 1 ${cx + r * Math.cos(a2)} ${cy - r * Math.sin(a2)}`;
}

function activeBand(value: number): FgBand {
  for (const seg of FG_SEGMENTS) {
    if (value <= seg.to) return seg;
  }
  return FG_SEGMENTS[FG_SEGMENTS.length - 1];
}

const GAUGE_WIDTH = 200;
const GAUGE_HEIGHT = 116;
const GAUGE_CX = GAUGE_WIDTH / 2;
const GAUGE_CY = GAUGE_HEIGHT - 10;
const GAUGE_R = Math.min(GAUGE_WIDTH / 2 - 12, GAUGE_HEIGHT - 22);

const FG_ARCS = FG_SEGMENTS.map((s) => ({
  d: fgArc(s.from, s.to, GAUGE_CX, GAUGE_CY, GAUGE_R),
  color: s.color,
  key: `${s.from}-${s.to}`,
}));

function FearGreedGauge({ data }: { data: FearGreedData }) {
  const band = activeBand(data.value);
  const ang = Math.PI - (data.value / 100) * Math.PI;
  const nx = GAUGE_CX + (GAUGE_R - 5) * Math.cos(ang);
  const ny = GAUGE_CY - (GAUGE_R - 5) * Math.sin(ang);

  return (
    <div className={styles.gaugeWrap}>
      <span className={styles.gaugeMarketLabel}>{data.market}</span>
      <svg
        className={styles.gaugeSvg}
        width={GAUGE_WIDTH}
        height={GAUGE_HEIGHT}
        viewBox={`0 0 ${GAUGE_WIDTH} ${GAUGE_HEIGHT}`}
        aria-label={`${data.market} Fear & Greed: ${data.value}`}
      >
        {FG_ARCS.map((a) => (
          <path
            key={a.key}
            d={a.d}
            stroke={a.color}
            strokeWidth="9"
            fill="none"
            strokeLinecap="butt"
          />
        ))}
        <line
          x1={GAUGE_CX}
          y1={GAUGE_CY}
          x2={nx}
          y2={ny}
          className={styles.needle}
        />
        <circle cx={GAUGE_CX} cy={GAUGE_CY} r="3" className={styles.needleHub} />
      </svg>
      <div className={styles.gaugeValue}>
        <div className={styles.gaugeNumber}>{data.value}</div>
        <div className={styles.gaugeLabel} style={{ color: band.color }}>
          {band.label}
        </div>
      </div>
    </div>
  );
}

export function IndicatorStrip({
  fearGreed,
  macros,
  marketTime,
}: {
  fearGreed: FearGreedData[];
  macros: MacroIndicator[];
  marketTime: string;
}) {
  return (
    <>
      <Card className={styles.fgCard}>
        <div className={styles.fgHeader}>
          <h2 className={styles.fgHeaderTitle}>공포 · 탐욕 지수</h2>
          <span className={styles.fgHeaderMeta}>일일 갱신</span>
        </div>
        <div className={styles.fgGauges}>
          <div className={styles.fgHalfFirst}>
            <FearGreedGauge data={fearGreed[0]} />
            <div className={styles.fgSubtext}>{fearGreed[0].subtext}</div>
          </div>
          <div className={styles.fgHalf}>
            <FearGreedGauge data={fearGreed[1]} />
            <div className={styles.fgSubtext}>{fearGreed[1].subtext}</div>
          </div>
        </div>
      </Card>

      <Card className={styles.macroCard}>
        <div className={styles.macroHeader}>
          <h2 className={styles.macroHeaderTitle}>핵심 경제지표</h2>
          <span className={styles.macroHeaderTime}>
            {marketTime} · 15분 지연
          </span>
        </div>
        <div className={styles.macroGrid}>
          {macros.map((m) => (
            <div key={m.label} className={styles.macroCell}>
              <div className={styles.macroCellTop}>
                <span className={styles.macroCellLabel}>{m.label}</span>
                <span className={styles.macroCellLocalName}>{m.localName}</span>
              </div>
              <div className={styles.macroCellValue}>
                <span className={styles.macroValueNum}>{m.value}</span>
                <span
                  className={m.up ? styles.macroChangePos : styles.macroChangeNeg}
                >
                  {m.up ? "▲" : "▼"} {m.change}
                </span>
                <svg
                  className={styles.macroSpark}
                  width="40"
                  height="14"
                  viewBox="0 0 40 14"
                  aria-hidden="true"
                >
                  <path
                    d={m.up ? SPARK_MACRO_UP : SPARK_MACRO_DOWN}
                    fill="none"
                    strokeWidth="1.2"
                    className={m.up ? styles.sparkUp : styles.sparkDown}
                  />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
