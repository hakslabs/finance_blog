/**
 * StockMiniChart — Lightweight area/line chart powered by klinecharts.
 *
 * For summary views (watchlist comparison rows, portfolio profit cards,
 * sparklines, 24-month trend pills). No indicators, no toolbar, minimal
 * chrome — built for density and performance.
 *
 * The same visual language as the full <StockChart>, so charts across the
 * app feel like a single product.
 */
import { useEffect, useMemo, useRef } from "react";
import { init, dispose, type Chart, type KLineData } from "klinecharts";
import { useTheme } from "@/contexts/ThemeContext";

export type MiniPoint = { date: string; value: number };

export interface StockMiniChartProps {
  /** Time series — date (YYYY-MM-DD) + scalar value (close / portfolio NAV / ratio). */
  data: MiniPoint[];
  /** Container height in px (default 56 — sparkline-ish). */
  height?: number;
  /** Render style: filled area (default) or thin line. */
  variant?: "area" | "line";
  /** Force a color (e.g., green for up, red for down). Defaults to up/down from data trend. */
  color?: string;
  /** Show price axis on the right (default false — tight summary look). */
  showAxis?: boolean;
  /** Show crosshair + tooltip on hover (default true; turn off for static sparklines). */
  interactive?: boolean;
}

function readToken(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

const UP = "#22c55e";
const DOWN = "#ef4444";

export default function StockMiniChart({
  data,
  height = 56,
  variant = "area",
  color,
  showAxis = false,
  interactive = true,
}: StockMiniChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<Chart | null>(null);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Trend-based default color: rising = green, falling = red.
  const trendColor = useMemo(() => {
    if (color) return color;
    if (data.length < 2) return UP;
    return data[data.length - 1].value >= data[0].value ? UP : DOWN;
  }, [color, data]);

  const klineData = useMemo<KLineData[]>(
    () =>
      data.map((p) => {
        const ts = new Date(p.date + "T00:00:00Z").getTime();
        // Area mode uses `close` only; open/high/low mirror it so candle metrics
        // stay valid if klinecharts ever needs them.
        return { timestamp: ts, open: p.value, high: p.value, low: p.value, close: p.value };
      }),
    [data],
  );

  useEffect(() => {
    if (!containerRef.current) return;
    const muted = readToken("--muted-foreground", isDark ? "#9ca3af" : "#6b7280");
    const border = readToken("--border", isDark ? "#1f2937" : "#e5e7eb");

    const chart = init(containerRef.current, {
      styles: {
        candle: {
          type: variant === "line" ? "area" : "area",
          area: {
            lineSize: variant === "line" ? 1.5 : 1.2,
            lineColor: trendColor,
            value: "close",
            smooth: false,
            backgroundColor:
              variant === "area"
                ? [
                    { offset: 0, color: trendColor + "55" },
                    { offset: 1, color: trendColor + "00" },
                  ]
                : [
                    { offset: 0, color: trendColor + "00" },
                    { offset: 1, color: trendColor + "00" },
                  ],
            point: { show: false, color: trendColor, radius: 2, rippleRadius: 4, rippleColor: trendColor },
          },
          priceMark: {
            show: false,
            high: { show: false, color: muted, textOffset: 0, textSize: 9, textFamily: "Helvetica", textWeight: "normal" },
            low:  { show: false, color: muted, textOffset: 0, textSize: 9, textFamily: "Helvetica", textWeight: "normal" },
            last: { show: false, upColor: trendColor, downColor: trendColor, noChangeColor: muted,
              line: { show: false, style: "dashed", dashedValue: [3, 3], size: 1 },
              text: { show: false, size: 9, paddingLeft: 2, paddingRight: 2, paddingTop: 1, paddingBottom: 1,
                style: "fill", color: "#fff", borderColor: "transparent", borderStyle: "solid", borderSize: 0, borderRadius: 2,
                backgroundColor: trendColor, family: "Helvetica", weight: "normal" } },
          },
          tooltip: {
            showRule: interactive ? "follow_cross" : "none",
            showType: "standard",
            offsetLeft: 4, offsetTop: 4, offsetRight: 4, offsetBottom: 4,
            title: { show: false, color: muted, size: 10, weight: "normal", family: "Helvetica", marginLeft: 0, marginRight: 0, marginTop: 0, marginBottom: 2, template: "" },
            legend: { color: muted, size: 10, weight: "normal", family: "Helvetica", marginLeft: 0, marginRight: 0, marginTop: 0, marginBottom: 0 },
          },
        },
        grid: {
          show: false,
          horizontal: { show: false, color: border, style: "dashed", dashedValue: [2, 4], size: 1 },
          vertical:   { show: false, color: border, style: "dashed", dashedValue: [2, 4], size: 1 },
        },
        xAxis: { show: false, axisLine: { show: false, color: border, size: 1 },
          tickLine: { show: false, color: border, size: 1, length: 3 },
          tickText: { show: false, color: muted, family: "Helvetica", weight: "normal", size: 9, marginStart: 2, marginEnd: 2 } },
        yAxis: { show: showAxis, position: "right", inside: false, reverse: false, size: showAxis ? 36 : 0,
          axisLine: { show: false, color: border, size: 1 },
          tickLine: { show: false, color: border, size: 1, length: 3 },
          tickText: { show: showAxis, color: muted, family: "Helvetica", weight: "normal", size: 9, marginStart: 2, marginEnd: 2 } },
        separator: { size: 0, color: border, fill: true, activeBackgroundColor: "transparent" },
        crosshair: {
          show: interactive,
          horizontal: { show: false, line: { show: false, style: "dashed", dashedValue: [3, 3], size: 1, color: muted },
            text: { show: false, style: "fill", color: "#fff", size: 9, family: "Helvetica", weight: "normal",
              borderStyle: "solid", borderDashedValue: [], borderSize: 0, borderColor: "transparent", borderRadius: 2,
              paddingLeft: 2, paddingRight: 2, paddingTop: 1, paddingBottom: 1, backgroundColor: muted } },
          vertical: { show: interactive, line: { show: true, style: "dashed", dashedValue: [3, 3], size: 1, color: muted },
            text: { show: false, style: "fill", color: "#fff", size: 9, family: "Helvetica", weight: "normal",
              borderStyle: "solid", borderDashedValue: [], borderSize: 0, borderColor: "transparent", borderRadius: 2,
              paddingLeft: 2, paddingRight: 2, paddingTop: 1, paddingBottom: 1, backgroundColor: muted } },
        },
      } as any,
    });
    if (!chart) return;
    chartRef.current = chart;
    chart.setZoomEnabled(false);
    chart.setScrollEnabled(false);
    chart.applyNewData(klineData);
    chart.setOffsetRightDistance(0);

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(containerRef.current);
    const el = containerRef.current;
    return () => {
      ro.disconnect();
      if (el) dispose(el);
      chartRef.current = null;
    };
    // Re-init only on visual config changes; data updates flow through the next effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark, variant, trendColor, showAxis, interactive]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.applyNewData(klineData);
  }, [klineData]);

  return <div ref={containerRef} style={{ height, width: "100%" }} />;
}
