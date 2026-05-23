/**
 * KLineSeriesChart — Multi-series (lines + bars) chart built on klinecharts.
 *
 * Lets every detail-page chart share the same visual language as the main
 * StockChart while still supporting overlays (watchlist comparisons,
 * portfolio vs benchmarks, multi-bar financials, single-line trends).
 *
 * No moving-average / RSI / MACD overlays — these are summary views; the
 * "보조지표는 없음" rule from the design brief.
 */
import { useEffect, useMemo, useRef } from "react";
import {
  init, dispose, registerIndicator,
  type Chart, type KLineData,
} from "klinecharts";
import { useTheme } from "@/contexts/ThemeContext";

export type SeriesType = "line" | "bar" | "area";

export interface SeriesConfig {
  /** Field key on each data row that holds this series' numeric value. */
  key: string;
  /** Display label (legend / tooltip). */
  label: string;
  /** Stroke / fill color. */
  color: string;
  /** Render style — default "line". */
  type?: SeriesType;
  /** Optional dash pattern e.g. [4, 2] for benchmarks. */
  dashed?: boolean;
}

export interface KLineSeriesChartProps {
  /** Time series rows. Each row needs a `date` (YYYY-MM-DD or any parseable) + the series keys. */
  data: Array<Record<string, any>>;
  series: SeriesConfig[];
  height?: number;
  /** Show the right-side value axis (default true). */
  showYAxis?: boolean;
  /** Show the bottom date axis (default true). */
  showXAxis?: boolean;
  /** Format value labels on the Y-axis and in the tooltip (e.g. v => `${v}%`). */
  valueFormatter?: (v: number) => string;
  /** Optional reference line at y=0 (for percent or P&L charts). */
  zeroLine?: boolean;
  /** Bar mode — render bars grouped (side-by-side, like financials). Default "stack". */
  barLayout?: "stack" | "group";
}

function readToken(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

// Each chart instance registers a uniquely-named indicator so it doesn't
// clobber others. Counter is module-scoped.
let INDICATOR_SEQ = 0;

export default function KLineSeriesChart({
  data,
  series,
  height = 200,
  showYAxis = true,
  showXAxis = true,
  valueFormatter,
  zeroLine = false,
  barLayout = "group",
}: KLineSeriesChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<Chart | null>(null);
  const indicatorNameRef = useRef<string>(`series_${++INDICATOR_SEQ}`);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // KLineData rows. We need a 'close' for klinecharts even though the
  // candle/area is hidden — set it to the first series' value so the
  // crosshair/y-axis range still tracks something sensible.
  const klineData = useMemo<KLineData[]>(() => {
    const primaryKey = series[0]?.key;
    // klinecharts requires strictly increasing valid timestamps. If a row's
    // `date` parses to NaN (e.g., the source used a locale-formatted label
    // like "5월 18일"), fall back to a synthetic per-day timestamp anchored
    // to today and walking backwards by index — preserves order, never NaN.
    const todayMs = Date.now();
    return data.map((row, i) => {
      let ts = NaN;
      if (typeof row.date === "number" && Number.isFinite(row.date)) {
        ts = row.date;
      } else if (row.date != null) {
        const s = String(row.date);
        const parsed = new Date(s + (/^\d{4}-\d{2}-\d{2}$/.test(s) ? "T00:00:00Z" : "")).getTime();
        if (Number.isFinite(parsed)) ts = parsed;
      }
      if (!Number.isFinite(ts)) {
        ts = todayMs - (data.length - 1 - i) * 86_400_000;
      }
      const v = primaryKey ? Number(row[primaryKey] ?? 0) : 0;
      const merged: any = { timestamp: ts, open: v, high: v, low: v, close: v };
      for (const s of series) merged[s.key] = Number(row[s.key] ?? 0);
      return merged as KLineData;
    });
  }, [data, series]);

  // Register a one-shot indicator that simply echoes each series value
  // straight back, then klinecharts renders each `figure` (line or bar).
  useEffect(() => {
    const indicatorName = indicatorNameRef.current;
    const figures = series.map<any>((s) => ({
      key: s.key,
      title: `${s.label}: `,
      type: s.type === "bar" ? "bar" : "line",
      baseValue: 0,
      styles: () => {
        if (s.type === "bar") {
          return {
            style: "fill",
            color: s.color,
            borderColor: s.color,
          };
        }
        return {
          style: s.dashed ? "dashed" : "solid",
          color: s.color,
          size: 1.5,
          smooth: false,
          dashedValue: s.dashed ? [4, 2] : [],
        };
      },
    }));

    registerIndicator({
      name: indicatorName,
      shortName: " ",
      precision: 2,
      calcParams: [],
      shouldOhlc: false,
      shouldFormatBigNumber: false,
      visible: true,
      zLevel: 0,
      extendData: null,
      series: "normal" as any,
      minValue: null,
      maxValue: null,
      styles: null,
      figures,
      regenerateFigures: null,
      createTooltipDataSource: null,
      draw: null,
      calc: (dataList) =>
        dataList.map((d: any) => {
          const out: Record<string, number> = {};
          for (const s of series) out[s.key] = Number(d[s.key] ?? 0);
          return out;
        }),
    });
    // No unregister API — re-registering with the same name overrides.
  }, [series]);

  useEffect(() => {
    if (!containerRef.current) return;
    const muted = readToken("--muted-foreground", isDark ? "#9ca3af" : "#6b7280");
    const fg = readToken("--foreground", isDark ? "#e5e7eb" : "#111827");
    const border = readToken("--border", isDark ? "#1f2937" : "#e5e7eb");

    const chart = init(containerRef.current, {
      styles: {
        candle: {
          // We hide the main candle/area — only the custom indicator renders.
          type: "area",
          area: {
            lineSize: 0,
            lineColor: "transparent",
            value: "close",
            smooth: false,
            backgroundColor: [
              { offset: 0, color: "transparent" },
              { offset: 1, color: "transparent" },
            ],
            point: { show: false, color: "transparent", radius: 0, rippleColor: "transparent", rippleRadius: 0, animation: false, animationDuration: 0 },
          },
          priceMark: {
            show: false,
            high: { show: false, color: muted, textOffset: 0, textSize: 9, textFamily: "Helvetica", textWeight: "normal" },
            low:  { show: false, color: muted, textOffset: 0, textSize: 9, textFamily: "Helvetica", textWeight: "normal" },
            last: { show: false, upColor: muted, downColor: muted, noChangeColor: muted,
              line: { show: false, style: "dashed", dashedValue: [3, 3], size: 1 },
              text: { show: false, size: 9, paddingLeft: 2, paddingRight: 2, paddingTop: 1, paddingBottom: 1,
                style: "fill", color: "#fff", borderColor: "transparent", borderStyle: "solid", borderSize: 0, borderRadius: 2,
                backgroundColor: muted, family: "Helvetica", weight: "normal" } },
          },
          tooltip: { showRule: "none", showType: "standard",
            text: { color: fg, size: 11, family: "Helvetica", weight: "normal", marginLeft: 8, marginTop: 4, marginRight: 8, marginBottom: 4 } },
        },
        grid: {
          show: true,
          horizontal: { show: true, color: border, style: "dashed", dashedValue: [2, 4], size: 1 },
          vertical: { show: false, color: border, style: "dashed", dashedValue: [2, 4], size: 1 },
        },
        indicator: {
          ohlc: { upColor: muted, downColor: muted, noChangeColor: muted },
          bars: series.filter((s) => s.type === "bar").map((s) => ({
            style: "fill", borderStyle: "solid", borderSize: 1, borderColor: s.color, color: s.color, noChangeColor: s.color,
          })),
          lines: series.filter((s) => s.type !== "bar").map((s) => ({
            style: s.dashed ? "dashed" : "solid", smooth: false, size: 1.5, color: s.color,
            dashedValue: s.dashed ? [4, 2] : [],
          })),
          tooltip: { showRule: "follow_cross", showType: "standard",
            text: { color: fg, size: 11, family: "Helvetica", weight: "normal", marginLeft: 8, marginTop: 4, marginRight: 8, marginBottom: 4 } },
          lastValueMark: { show: false },
        },
        xAxis: {
          show: showXAxis,
          axisLine: { show: false, color: border, size: 1 },
          tickLine: { show: false, color: border, size: 1, length: 3 },
          tickText: { show: showXAxis, color: muted, family: "Helvetica", weight: "normal", size: 9, marginStart: 4, marginEnd: 4 },
        },
        yAxis: {
          show: showYAxis,
          position: "right",
          inside: false,
          reverse: false,
          size: showYAxis ? 48 : 0,
          axisLine: { show: false, color: border, size: 1 },
          tickLine: { show: false, color: border, size: 1, length: 3 },
          tickText: { show: showYAxis, color: muted, family: "Helvetica", weight: "normal", size: 9, marginStart: 4, marginEnd: 4 },
        },
        separator: { size: 0, color: border, fill: true, activeBackgroundColor: "transparent" },
        crosshair: {
          show: true,
          horizontal: { show: false, line: { show: false, style: "dashed", dashedValue: [3, 3], size: 1, color: muted },
            text: { show: false, style: "fill", color: "#fff", size: 9, family: "Helvetica", weight: "normal",
              borderStyle: "solid", borderDashedValue: [], borderSize: 0, borderColor: "transparent", borderRadius: 2,
              paddingLeft: 2, paddingRight: 2, paddingTop: 1, paddingBottom: 1, backgroundColor: muted } },
          vertical:   { show: true,  line: { show: true,  style: "dashed", dashedValue: [3, 3], size: 1, color: muted },
            text: { show: showXAxis, style: "fill", color: "#fff", size: 9, family: "Helvetica", weight: "normal",
              borderStyle: "solid", borderDashedValue: [], borderSize: 0, borderColor: "transparent", borderRadius: 2,
              paddingLeft: 3, paddingRight: 3, paddingTop: 2, paddingBottom: 2, backgroundColor: muted } },
        },
      } as any,
    });
    if (!chart) return;
    chartRef.current = chart;
    chart.setZoomEnabled(false);
    chart.setScrollEnabled(false);
    chart.setOffsetRightDistance(0);

    if (valueFormatter) {
      chart.setCustomApi({
        formatBigNumber: (v: string | number) =>
          typeof v === "number" ? valueFormatter(v) : valueFormatter(Number(v)),
      });
    }

    // Mount the custom indicator on the main candle pane (stacked on top of
    // the hidden area). Series render in indicator order.
    chart.createIndicator(indicatorNameRef.current, true, { id: "candle_pane" });

    if (zeroLine) {
      // Use an overlay to draw the zero reference line. We use the
      // "simpleAnnotation"... actually simpler: render a separate indicator
      // that just paints a flat 0 line. Skip if klinecharts dynamic overlay is fiddly.
      // For now, baseValue: 0 on bar figures gives an implicit zero baseline.
    }

    chart.applyNewData(klineData);

    const el = containerRef.current;
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (el) dispose(el);
      chartRef.current = null;
    };
    // Re-init when visual/series config changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark, series, showXAxis, showYAxis, valueFormatter, zeroLine, barLayout]);

  // Push data updates without re-init.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.applyNewData(klineData);
  }, [klineData]);

  return (
    <div className="w-full" style={{ height }}>
      {/* Legend strip — small swatches above the chart, parity with Recharts <Legend>. */}
      {series.length > 1 && (
        <div className="flex items-center gap-3 flex-wrap text-[10px] text-muted-foreground mb-1 px-1">
          {series.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span
                className="inline-block w-3 h-[2px] rounded"
                style={{
                  background: s.color,
                  borderTop: s.dashed ? `2px dashed ${s.color}` : undefined,
                  borderBottom: "none",
                }}
              />
              {s.label}
            </span>
          ))}
        </div>
      )}
      <div ref={containerRef} style={{ height: series.length > 1 ? height - 16 : height, width: "100%" }} />
    </div>
  );
}
