/**
 * StockChart — Brokerage-grade price chart powered by klinecharts (Apache-2.0).
 *
 * One source of truth for the price pane + indicator stack used by both
 * /stocks/:ticker (StockDetail) and the slide-out panel on /analysis.
 *
 *  - Real OHLCV from /v1/stocks/:ticker/bars (no mock data)
 *  - Daily / weekly / monthly candles with proper wicks
 *  - Native overlay indicators (MA / BOLL) on the price pane
 *  - Native sub-panes (VOL / MACD / RSI / KDJ) with synced crosshair
 *  - Theme-aware (dark / light) via ThemeContext
 *  - Period selector 1W..5Y; aggregation switches candle interval
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { init, dispose, type Chart, type KLineData } from "klinecharts";
import { cn } from "@/lib/utils";
import { useStockBars } from "@/features/stocks";
import { useTheme } from "@/contexts/ThemeContext";

export type IndicatorKey = "ma" | "boll" | "vol" | "macd" | "rsi" | "kdj";
export type IndicatorSet = Record<IndicatorKey, boolean>;
export type PeriodKey = "1W" | "1M" | "3M" | "6M" | "1Y" | "2Y" | "5Y";
export type Timeframe = "D" | "W" | "M";

const PERIOD_DAYS: Record<PeriodKey, number> = {
  "1W": 7,
  "1M": 22,
  "3M": 66,
  "6M": 130,
  "1Y": 252,
  "2Y": 504,
  "5Y": 1300,
};
const PERIOD_ORDER: PeriodKey[] = ["1W", "1M", "3M", "6M", "1Y", "2Y", "5Y"];

/**
 * How many bars should be visible at once for each period/timeframe combo.
 * Daily=raw, Weekly≈÷5, Monthly≈÷22.
 * Drives setBarSpace() so 5Y on daily doesn't squash 1300 bars into 800px.
 */
function visibleBarsFor(period: PeriodKey, tf: Timeframe): number {
  const days = PERIOD_DAYS[period];
  if (tf === "M") return Math.max(6, Math.round(days / 22));
  if (tf === "W") return Math.max(6, Math.round(days / 5));
  return days;
}
const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  D: "일봉",
  W: "주봉",
  M: "월봉",
};

// Default to the minimal brokerage-app baseline: candles + volume only.
const DEFAULT_INDICATORS: IndicatorSet = {
  ma: false,
  boll: false,
  vol: true,
  macd: false,
  rsi: false,
  kdj: false,
};

const OVERLAY_INDICATORS: IndicatorKey[] = ["ma", "boll"];
const PANE_INDICATORS: IndicatorKey[] = ["vol", "macd", "rsi", "kdj"];

const INDICATOR_LABEL: Record<IndicatorKey, string> = {
  ma: "MA",
  boll: "BOLL",
  vol: "거래량",
  macd: "MACD",
  rsi: "RSI",
  kdj: "KDJ",
};

// Map our keys to klinecharts' built-in indicator names (case-sensitive).
const INDICATOR_NAME: Record<IndicatorKey, string> = {
  ma: "MA",
  boll: "BOLL",
  vol: "VOL",
  macd: "MACD",
  rsi: "RSI",
  kdj: "KDJ",
};

type DailyBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

function aggregate(bars: DailyBar[], tf: Timeframe): DailyBar[] {
  if (tf === "D" || bars.length === 0) return bars;
  const keyOf = (d: string): string => {
    const dt = new Date(d);
    if (tf === "M")
      return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;
    const tmp = new Date(
      Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()),
    );
    const day = (tmp.getUTCDay() + 6) % 7; // 0 = Mon
    tmp.setUTCDate(tmp.getUTCDate() - day);
    return `${tmp.getUTCFullYear()}-${String(tmp.getUTCMonth() + 1).padStart(2, "0")}-${String(tmp.getUTCDate()).padStart(2, "0")}`;
  };
  const groups = new Map<string, DailyBar[]>();
  for (const b of bars) {
    const k = keyOf(b.date);
    const arr = groups.get(k);
    if (arr) arr.push(b);
    else groups.set(k, [b]);
  }
  const out: DailyBar[] = [];
  for (const [, grp] of groups) {
    if (!grp.length) continue;
    out.push({
      date: grp[grp.length - 1].date,
      open: grp[0].open,
      close: grp[grp.length - 1].close,
      high: Math.max(...grp.map((g) => g.high)),
      low: Math.min(...grp.map((g) => g.low)),
      volume: grp.reduce((s, g) => s + g.volume, 0),
    });
  }
  out.sort((a, b) => (a.date < b.date ? -1 : 1));
  return out;
}

function toKlineData(bars: DailyBar[]): KLineData[] {
  return bars.map((b) => ({
    timestamp: new Date(b.date + "T00:00:00Z").getTime(),
    open: b.open,
    high: b.high,
    low: b.low,
    close: b.close,
    volume: b.volume,
  }));
}

// Pull theme tokens from the live CSS so the chart matches the rest of the UI.
function readToken(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}

function buildStyles(dark: boolean) {
  // Brand-aligned up/down palette (matches PALETTE in legacy chart).
  const up = "#22c55e";
  const down = "#ef4444";
  const fg = readToken("--foreground", dark ? "#e5e7eb" : "#111827");
  const muted = readToken("--muted-foreground", dark ? "#9ca3af" : "#6b7280");
  const border = readToken("--border", dark ? "#1f2937" : "#e5e7eb");

  return {
    grid: {
      horizontal: { color: border, style: "dashed", dashedValue: [2, 4] },
      vertical: {
        color: border,
        style: "dashed",
        dashedValue: [2, 4],
        show: false,
      },
    },
    candle: {
      type: "candle_solid",
      bar: {
        upColor: up,
        downColor: down,
        noChangeColor: muted,
        upBorderColor: up,
        downBorderColor: down,
        upWickColor: up,
        downWickColor: down,
      },
      tooltip: {
        showRule: "follow_cross",
        showType: "standard",
        text: {
          color: fg,
          size: 11,
          family: "Helvetica",
          weight: "normal",
          marginLeft: 8,
          marginTop: 4,
          marginRight: 8,
          marginBottom: 4,
        },
      },
      priceMark: {
        last: {
          show: true,
          upColor: up,
          downColor: down,
          noChangeColor: muted,
          line: { show: true, style: "dashed", dashedValue: [3, 3], size: 1 },
          text: {
            show: true,
            size: 10,
            paddingLeft: 4,
            paddingRight: 4,
            paddingTop: 2,
            paddingBottom: 2,
          },
        },
        high: { color: muted, textSize: 10 },
        low: { color: muted, textSize: 10 },
      },
    },
    indicator: {
      ohlc: { upColor: up, downColor: down, noChangeColor: muted },
      bars: [
        {
          style: "fill",
          borderStyle: "solid",
          borderSize: 1,
          borderColor: up,
          color: up,
          noChangeColor: muted,
        },
      ],
      lines: [
        { style: "solid", smooth: false, size: 1, color: "#FBBF24" },
        { style: "solid", smooth: false, size: 1, color: "#A78BFA" },
        { style: "solid", smooth: false, size: 1, color: "#F87171" },
        { style: "solid", smooth: false, size: 1, color: "#38BDF8" },
      ],
      tooltip: {
        showRule: "follow_cross",
        showType: "standard",
        text: {
          color: fg,
          size: 11,
          family: "Helvetica",
          weight: "normal",
          marginLeft: 8,
          marginTop: 4,
          marginRight: 8,
          marginBottom: 4,
        },
      },
      lastValueMark: { show: false },
    },
    xAxis: {
      axisLine: { color: border },
      tickLine: { color: border },
      tickText: { color: muted, size: 10 },
    },
    yAxis: {
      position: "right",
      axisLine: { color: border, show: false },
      tickLine: { color: border, show: false },
      tickText: { color: muted, size: 10 },
    },
    crosshair: {
      horizontal: {
        line: { color: muted, style: "dashed", dashedValue: [3, 3] },
        text: { color: fg, backgroundColor: border },
      },
      vertical: {
        line: { color: muted, style: "dashed", dashedValue: [3, 3] },
        text: { color: fg, backgroundColor: border },
      },
    },
    separator: { color: border, size: 1 },
  } as const;
}

function Chip({
  on,
  label,
  onClick,
}: {
  on: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "text-[11px] px-2 py-0.5 rounded border transition-all font-medium",
        on
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40",
      )}
    >
      {label}
    </button>
  );
}

export interface StockChartProps {
  ticker: string;
  currency?: "USD" | "KRW";
  initialPeriod?: PeriodKey;
  initialTimeframe?: Timeframe;
  initialIndicators?: Partial<IndicatorSet>;
  /** Optional override for the price pane height (default 360) */
  priceHeight?: number;
}

export default function StockChart({
  ticker,
  currency,
  initialPeriod = "3M",
  initialTimeframe = "D",
  initialIndicators,
  priceHeight = 360,
}: StockChartProps) {
  const [period, setPeriod] = useState<PeriodKey>(initialPeriod);
  const [timeframe, setTimeframe] = useState<Timeframe>(initialTimeframe);
  const [indicators, setIndicators] = useState<IndicatorSet>({
    ...DEFAULT_INDICATORS,
    ...(initialIndicators ?? {}),
  });
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<Chart | null>(null);
  // Track which pane indicators are currently mounted, so toggling is
  // a precise add/remove rather than a full chart rebuild (no flicker).
  const mountedPanes = useRef<Set<IndicatorKey>>(new Set());
  const mountedOverlays = useRef<Set<IndicatorKey>>(new Set());

  const days = PERIOD_DAYS[period];
  // Weekly / monthly views need more raw daily bars to fill the same range.
  const fetchDays =
    timeframe === "M" ? days * 22 : timeframe === "W" ? days * 5 : days;
  const { data: barsData, loading } = useStockBars(
    ticker || undefined,
    fetchDays,
  );

  const klineData = useMemo<KLineData[]>(() => {
    if (!barsData || barsData.length === 0) return [];
    const agg = aggregate(barsData as DailyBar[], timeframe);
    return toKlineData(agg);
  }, [barsData, timeframe]);

  const inferredCurrency: "USD" | "KRW" =
    currency ?? (/^\d/.test(ticker) ? "KRW" : "USD");
  const pricePrecision = inferredCurrency === "KRW" ? 0 : 2;

  // Mount / unmount the chart instance. Theme changes recreate it so styles
  // re-resolve from CSS variables — cheap, and avoids stale color caches.
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = init(containerRef.current, {
      styles: buildStyles(isDark) as any,
    });
    if (!chart) return;
    chartRef.current = chart;
    chart.setPriceVolumePrecision(pricePrecision, 0);
    mountedPanes.current = new Set();
    mountedOverlays.current = new Set();

    // Apply current indicator selection
    for (const k of OVERLAY_INDICATORS) {
      if (indicators[k]) {
        chart.createIndicator(INDICATOR_NAME[k], true, { id: "candle_pane" });
        mountedOverlays.current.add(k);
      }
    }
    for (const k of PANE_INDICATORS) {
      if (indicators[k]) {
        chart.createIndicator(INDICATOR_NAME[k], false, {
          id: `pane_${k}`,
          height: k === "vol" ? 80 : 110,
        });
        mountedPanes.current.add(k);
      }
    }

    const el = containerRef.current;
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (el) dispose(el);
      chartRef.current = null;
    };
    // We intentionally only re-init on theme flip; indicator/data changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark]);

  // Push data whenever it changes.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.setPriceVolumePrecision(pricePrecision, 0);
    chart.applyNewData(klineData);
  }, [klineData, pricePrecision]);

  // After data lands OR the period/timeframe changes, defer one frame so
  // klinecharts has finished its internal layout, then set the per-bar
  // pixel width to fit the selected window. Without this, 1300 bars
  // (5Y) collapse to 0.6px each and any zoom/pan tears the layout.
  //
  // Doing this in a *separate* effect (rather than chaining inside the
  // data effect) means the chart stays responsive while bars are still
  // refetching — applyNewData updates the bars, this re-targets the zoom.
  useEffect(() => {
    if (klineData.length === 0) return;
    const raf = requestAnimationFrame(() => {
      const chart = chartRef.current;
      const el = containerRef.current;
      if (!chart || !el) return;
      const plotWidth = Math.max(120, el.clientWidth - 56); // 56 ≈ y-axis width
      const targetBars = visibleBarsFor(period, timeframe);
      // No upper clamp — long periods need sub-pixel-ish bars (klinecharts
      // handles this gracefully). Lower clamp 0.4 prevents division traps.
      const space = Math.max(0.4, plotWidth / targetBars);
      chart.setBarSpace(space);
      chart.setOffsetRightDistance(24);
      chart.setLeftMinVisibleBarCount(6);
      chart.setRightMinVisibleBarCount(6);
      chart.scrollToRealTime();
      chart.resize();
    });
    return () => cancelAnimationFrame(raf);
  }, [klineData, period, timeframe]);

  // Window resize hook — ResizeObserver covers most cases but doesn't fire
  // for some viewport/zoom changes on Safari. Belt + suspenders.
  useEffect(() => {
    const onResize = () => chartRef.current?.resize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Sync indicator toggles incrementally so the chart never flashes.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    for (const k of OVERLAY_INDICATORS) {
      const have = mountedOverlays.current.has(k);
      if (indicators[k] && !have) {
        chart.createIndicator(INDICATOR_NAME[k], true, { id: "candle_pane" });
        mountedOverlays.current.add(k);
      } else if (!indicators[k] && have) {
        chart.removeIndicator("candle_pane", INDICATOR_NAME[k]);
        mountedOverlays.current.delete(k);
      }
    }
    for (const k of PANE_INDICATORS) {
      const have = mountedPanes.current.has(k);
      if (indicators[k] && !have) {
        chart.createIndicator(INDICATOR_NAME[k], false, {
          id: `pane_${k}`,
          height: k === "vol" ? 80 : 110,
        });
        mountedPanes.current.add(k);
      } else if (!indicators[k] && have) {
        // Removing the only indicator on a pane removes the pane itself.
        chart.removeIndicator(`pane_${k}`, INDICATOR_NAME[k]);
        mountedPanes.current.delete(k);
      }
    }
  }, [indicators]);

  const toggle = (k: IndicatorKey) =>
    setIndicators((p) => ({ ...p, [k]: !p[k] }));

  // Total height = price pane + each active sub-pane (matches klinecharts layout).
  const subPanesHeight = PANE_INDICATORS.reduce(
    (sum, k) => sum + (indicators[k] ? (k === "vol" ? 80 : 110) : 0),
    0,
  );
  const totalHeight = priceHeight + subPanesHeight + 24; // 24 = bottom x-axis labels

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="border-b border-border px-3 py-2 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-muted/40 p-0.5 rounded-md">
            {(["D", "W", "M"] as Timeframe[]).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={cn(
                  "text-[11px] px-2 py-1 rounded transition-colors font-medium",
                  timeframe === t
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {TIMEFRAME_LABELS[t]}
              </button>
            ))}
          </div>
          <div className="flex items-center bg-muted/40 p-0.5 rounded-md">
            {PERIOD_ORDER.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "text-[11px] px-2 py-1 rounded transition-colors font-medium",
                  period === p
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-muted-foreground">오버레이</span>
          {OVERLAY_INDICATORS.map((k) => (
            <Chip
              key={k}
              on={indicators[k]}
              label={INDICATOR_LABEL[k]}
              onClick={() => toggle(k)}
            />
          ))}
          <span className="text-[10px] text-muted-foreground ml-1.5">패널</span>
          {PANE_INDICATORS.map((k) => (
            <Chip
              key={k}
              on={indicators[k]}
              label={INDICATOR_LABEL[k]}
              onClick={() => toggle(k)}
            />
          ))}
        </div>
      </div>

      {/* Chart canvas. klinecharts owns this DOM node — never render React children inside. */}
      <div className="relative">
        <div ref={containerRef} style={{ height: totalHeight }} />
        {klineData.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs pointer-events-none">
            {loading
              ? "차트 데이터를 불러오는 중…"
              : "표시할 데이터가 없습니다"}
          </div>
        )}
      </div>
    </div>
  );
}
