import { useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowLeft,
  Loader2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useQuote } from "@/features/quotes";
import type { QuoteRange } from "@/features/quotes";

const RANGES: { id: QuoteRange; label: string }[] = [
  { id: "1mo", label: "1M" },
  { id: "3mo", label: "3M" },
  { id: "6mo", label: "6M" },
  { id: "1y", label: "1Y" },
  { id: "5y", label: "5Y" },
];

function formatPrice(n: number, currency: string): string {
  const opts: Intl.NumberFormatOptions =
    n >= 1000
      ? { maximumFractionDigits: 0 }
      : { maximumFractionDigits: 2, minimumFractionDigits: 2 };
  const sym = currency === "USD" ? "$" : currency === "KRW" ? "₩" : "";
  return `${sym}${n.toLocaleString(undefined, opts)}`;
}

function formatVolume(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return String(v);
}

export default function StockDetail() {
  const { ticker } = useParams<{ ticker: string }>();
  const [range, setRange] = useState<QuoteRange>("6mo");
  const { data, loading, error } = useQuote(ticker, range);

  const chartData = useMemo(
    () =>
      (data?.bars ?? []).map((b) => ({
        date: b.t.slice(0, 10),
        close: b.c,
        volume: b.v,
        high: b.h,
        low: b.l,
      })),
    [data],
  );

  const stats = useMemo(() => {
    if (!data || data.bars.length === 0) return null;
    const closes = data.bars.map((b) => b.c);
    const high = Math.max(...data.bars.map((b) => b.h));
    const low = Math.min(...data.bars.map((b) => b.l));
    const first = closes[0];
    const last = closes[closes.length - 1];
    const periodReturn = ((last - first) / first) * 100;
    return { high, low, periodReturn };
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        시세를 불러오는 중…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-destructive">
          {error?.message ?? `종목 ${ticker}을(를) 찾을 수 없습니다.`}
        </p>
        <Link href="/stocks">
          <button className="text-xs text-emerald-400 hover:underline">
            ← 종목 목록으로
          </button>
        </Link>
      </div>
    );
  }

  const up = data.change_pct >= 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/stocks">
            <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-card transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          <div className="flex-1">
            <div className="flex items-baseline gap-3">
              <h1 className="text-lg font-mono font-bold">{data.symbol}</h1>
              <Badge variant="outline" className="font-mono">
                {data.currency}
              </Badge>
              {data.stale && (
                <Badge variant="outline" className="text-amber-400 border-amber-500/40">
                  stale
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              기준: {data.as_of.slice(0, 10)} · 최신 수집:{" "}
              {(data.last_refreshed_at ?? "").slice(0, 16).replace("T", " ")}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Price headline */}
        <section className="flex items-baseline gap-4 flex-wrap">
          <span className="text-4xl font-mono font-bold tabular-nums">
            {formatPrice(data.last, data.currency)}
          </span>
          <span
            className={`flex items-center gap-1 text-lg font-mono ${
              up ? "text-up" : "text-down"
            }`}
          >
            {up ? (
              <TrendingUp className="w-5 h-5" />
            ) : (
              <TrendingDown className="w-5 h-5" />
            )}
            {up ? "+" : ""}
            {data.change.toFixed(2)}
            <span className="text-base">
              ({up ? "+" : ""}
              {data.change_pct.toFixed(2)}%)
            </span>
          </span>
        </section>

        {/* Range toggle */}
        <div className="inline-flex rounded-md border border-border/60 overflow-hidden text-xs">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`px-3 py-1.5 font-mono ${
                range === r.id
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Price chart */}
        <section className="rounded-xl border border-border/60 bg-card/40 p-4">
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={up ? "var(--up)" : "var(--down)"}
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="100%"
                      stopColor={up ? "var(--up)" : "var(--down)"}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeOpacity={0.3} vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  minTickGap={32}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  width={56}
                  tickFormatter={(v) =>
                    typeof v === "number" ? v.toFixed(0) : String(v)
                  }
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  formatter={(value: number) => formatPrice(value, data.currency)}
                />
                <Area
                  type="monotone"
                  dataKey="close"
                  stroke={up ? "var(--up)" : "var(--down)"}
                  strokeWidth={1.5}
                  fill="url(#g)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Period stats */}
        {stats && (
          <section className="grid grid-cols-3 gap-3">
            <Stat
              label={`${range} 수익률`}
              value={`${stats.periodReturn >= 0 ? "+" : ""}${stats.periodReturn.toFixed(2)}%`}
              tone={stats.periodReturn >= 0 ? "up" : "down"}
            />
            <Stat
              label={`${range} 고점`}
              value={formatPrice(stats.high, data.currency)}
            />
            <Stat
              label={`${range} 저점`}
              value={formatPrice(stats.low, data.currency)}
            />
          </section>
        )}

        {/* OHLCV table (last 10 bars) */}
        <section>
          <h2 className="text-xs font-mono uppercase tracking-wide text-muted-foreground mb-2">
            최근 OHLCV
          </h2>
          <div className="overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full text-xs">
              <thead className="bg-card/40 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">날짜</th>
                  <th className="px-3 py-2 text-right font-medium">시가</th>
                  <th className="px-3 py-2 text-right font-medium">고가</th>
                  <th className="px-3 py-2 text-right font-medium">저가</th>
                  <th className="px-3 py-2 text-right font-medium">종가</th>
                  <th className="px-3 py-2 text-right font-medium">거래량</th>
                </tr>
              </thead>
              <tbody>
                {data.bars
                  .slice(-10)
                  .reverse()
                  .map((b) => (
                    <tr
                      key={b.t}
                      className="border-t border-border/40 hover:bg-card/40 tabular-nums font-mono"
                    >
                      <td className="px-3 py-1.5">{b.t.slice(0, 10)}</td>
                      <td className="px-3 py-1.5 text-right">
                        {b.o.toFixed(2)}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        {b.h.toFixed(2)}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        {b.l.toFixed(2)}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        {b.c.toFixed(2)}
                      </td>
                      <td className="px-3 py-1.5 text-right text-muted-foreground">
                        {formatVolume(b.v)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-1 text-sm font-mono ${
          tone === "up" ? "text-up" : tone === "down" ? "text-down" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
