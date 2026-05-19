import { useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowLeft,
  CalendarClock,
  ExternalLink,
  Loader2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useQuote } from "@/features/quotes";
import type { QuoteRange } from "@/features/quotes";
import {
  useStockConsensus,
  useStockHolders,
  useStockNextEarning,
  useStockProfile,
} from "@/features/stocks";
import type { StockMetrics } from "@/features/stocks";

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

function formatCompact(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString();
}

function fmtNum(n: number | null | undefined, decimals = 2, suffix = ""): string {
  if (n == null) return "—";
  return `${n.toFixed(decimals)}${suffix}`;
}

export default function StockDetail() {
  const { ticker } = useParams<{ ticker: string }>();
  const [range, setRange] = useState<QuoteRange>("6mo");
  const { data: quote, loading, error } = useQuote(ticker, range);
  const { data: profile } = useStockProfile(ticker);
  const { data: consensus } = useStockConsensus(ticker);
  const { data: holders } = useStockHolders(ticker);
  const { data: nextEarning } = useStockNextEarning(ticker);

  const chartData = useMemo(
    () =>
      (quote?.bars ?? []).map((b) => ({
        date: b.t.slice(0, 10),
        close: b.c,
        volume: b.v,
      })),
    [quote],
  );

  const stats = useMemo(() => {
    if (!quote || quote.bars.length === 0) return null;
    const closes = quote.bars.map((b) => b.c);
    const high = Math.max(...quote.bars.map((b) => b.h));
    const low = Math.min(...quote.bars.map((b) => b.l));
    const first = closes[0];
    const last = closes[closes.length - 1];
    const periodReturn = ((last - first) / first) * 100;
    return { high, low, periodReturn };
  }, [quote]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        시세를 불러오는 중…
      </div>
    );
  }

  if (error || !quote) {
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

  const up = quote.change_pct >= 0;
  const displayName = profile?.profile.name ?? quote.symbol;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/stocks">
            <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-card transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          {profile?.profile.logo && (
            <img
              src={profile.profile.logo}
              alt=""
              className="w-8 h-8 rounded-md bg-card object-contain border border-border/40"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h1 className="text-lg font-bold leading-tight truncate">
                {displayName}
              </h1>
              <span className="text-sm font-mono text-muted-foreground">
                {quote.symbol}
              </span>
              <Badge variant="outline" className="font-mono text-[10px]">
                {quote.currency}
              </Badge>
              {profile?.profile.exchange && (
                <span className="text-[11px] text-muted-foreground">
                  {profile.profile.exchange}
                </span>
              )}
              {quote.stale && (
                <Badge
                  variant="outline"
                  className="text-amber-400 border-amber-500/40 text-[10px]"
                >
                  stale
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              기준 {quote.as_of.slice(0, 10)} · 갱신{" "}
              {(quote.last_refreshed_at ?? "").slice(0, 16).replace("T", " ")}
            </p>
          </div>
          {profile?.profile.weburl && (
            <a
              href={profile.profile.weburl}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              홈페이지
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Price headline */}
        <section className="flex items-baseline gap-4 flex-wrap">
          <span className="text-4xl font-mono font-bold tabular-nums">
            {formatPrice(quote.last, quote.currency)}
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
            {quote.change.toFixed(2)}
            <span className="text-base">
              ({up ? "+" : ""}
              {quote.change_pct.toFixed(2)}%)
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
                <CartesianGrid
                  stroke="var(--border)"
                  strokeOpacity={0.3}
                  vertical={false}
                />
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
                  formatter={(value: number) =>
                    formatPrice(value, quote.currency)
                  }
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
              value={formatPrice(stats.high, quote.currency)}
            />
            <Stat
              label={`${range} 저점`}
              value={formatPrice(stats.low, quote.currency)}
            />
          </section>
        )}

        {/* Profile metrics */}
        {profile && <MetricsGrid metrics={profile.metrics} />}

        {/* Next earning + Holders side by side on wider screens */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NextEarningCard
            data={nextEarning?.next}
            currency={quote.currency}
          />
          <HoldersCard items={holders?.items ?? null} />
        </div>

        {/* Analyst consensus */}
        <ConsensusCard rows={consensus?.recommendations ?? null} />
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

function MetricsGrid({ metrics }: { metrics: StockMetrics }) {
  const items: { label: string; value: string }[] = [
    { label: "PER (TTM)", value: fmtNum(metrics.pe_ttm) },
    { label: "PBR", value: fmtNum(metrics.pb) },
    { label: "ROE (TTM)", value: fmtNum(metrics.roe_ttm, 1, "%") },
    { label: "배당수익률", value: fmtNum(metrics.dividend_yield, 2, "%") },
    { label: "Beta", value: fmtNum(metrics.beta) },
    { label: "EPS (TTM)", value: fmtNum(metrics.eps_ttm) },
    { label: "52w 고점", value: fmtNum(metrics.week52_high) },
    { label: "52w 저점", value: fmtNum(metrics.week52_low) },
    { label: "유동비율", value: fmtNum(metrics.current_ratio) },
    { label: "부채/자본", value: fmtNum(metrics.debt_equity) },
  ];
  return (
    <section>
      <h2 className="text-xs font-mono uppercase tracking-wide text-muted-foreground mb-2">
        밸류에이션
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {items.map((it) => (
          <div
            key={it.label}
            className="rounded-lg border border-border/60 bg-card/40 px-3 py-2"
          >
            <div className="text-[10px] text-muted-foreground">{it.label}</div>
            <div className="text-sm font-mono tabular-nums">{it.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function NextEarningCard({
  data,
  currency,
}: {
  data: import("@/features/stocks").NextEarning | null | undefined;
  currency: string;
}) {
  return (
    <section className="rounded-xl border border-border/60 bg-card/40 p-4">
      <div className="flex items-center gap-2 mb-3">
        <CalendarClock className="w-4 h-4 text-violet-400" />
        <h2 className="text-sm font-semibold">다음 실적 발표</h2>
      </div>
      {!data ? (
        <p className="text-xs text-muted-foreground">
          예정된 실적 발표 정보가 없습니다.
        </p>
      ) : (
        <dl className="text-xs space-y-1.5">
          <Row label="일자" value={data.date} />
          <Row
            label="시점"
            value={
              data.hour === "bmo"
                ? "장 시작 전"
                : data.hour === "amc"
                ? "장 마감 후"
                : data.hour ?? "—"
            }
          />
          {data.year && data.quarter && (
            <Row label="분기" value={`${data.year} Q${data.quarter}`} />
          )}
          <Row
            label="EPS 예상치"
            value={data.eps_estimate != null ? data.eps_estimate.toFixed(2) : "—"}
          />
          <Row
            label="매출 예상치"
            value={
              data.revenue_estimate != null
                ? `${currency === "USD" ? "$" : ""}${formatCompact(data.revenue_estimate)}`
                : "—"
            }
          />
        </dl>
      )}
    </section>
  );
}

function HoldersCard({
  items,
}: {
  items: import("@/features/stocks").StockHolder[] | null;
}) {
  return (
    <section className="rounded-xl border border-border/60 bg-card/40 p-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-emerald-400" />
        <h2 className="text-sm font-semibold">거장 보유 현황 (13F)</h2>
      </div>
      {!items ? (
        <p className="text-xs text-muted-foreground">불러오는 중…</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          이 종목을 보유한 등록 거장이 없습니다.
        </p>
      ) : (
        <ul className="space-y-1.5 text-xs">
          {items.slice(0, 6).map((h) => (
            <li key={`${h.filer_name}-${h.filed_at}`}>
              {h.master_slug ? (
                <Link href={`/masters/${h.master_slug}`}>
                  <HolderRow holder={h} />
                </Link>
              ) : (
                <HolderRow holder={h} />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function HolderRow({
  holder,
}: {
  holder: import("@/features/stocks").StockHolder;
}) {
  return (
    <div className="flex items-center justify-between hover:bg-card/60 transition-colors rounded px-2 py-1 cursor-pointer">
      <span className="truncate">{holder.filer_name}</span>
      <span className="font-mono tabular-nums">
        {holder.weight_pct != null ? `${holder.weight_pct.toFixed(2)}%` : "—"}
        <span className="text-muted-foreground ml-2 text-[10px]">
          {formatCompact(holder.market_value)}
        </span>
      </span>
    </div>
  );
}

function ConsensusCard({
  rows,
}: {
  rows: import("@/features/stocks").ConsensusRow[] | null;
}) {
  if (!rows || rows.length === 0) return null;
  const chartRows = rows
    .slice(0, 6)
    .reverse()
    .map((r) => ({
      period: r.period.slice(2, 7),
      strongBuy: r.strong_buy,
      buy: r.buy,
      hold: r.hold,
      sell: r.sell,
      strongSell: r.strong_sell,
    }));
  return (
    <section>
      <h2 className="text-xs font-mono uppercase tracking-wide text-muted-foreground mb-2">
        애널리스트 컨센서스 (최근 6개월)
      </h2>
      <div className="rounded-lg border border-border/60 bg-card/40 p-3 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartRows}>
            <CartesianGrid
              stroke="var(--border)"
              strokeOpacity={0.3}
              vertical={false}
            />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            />
            <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                fontSize: 11,
              }}
            />
            <Bar dataKey="strongBuy" stackId="r" fill="var(--up)" />
            <Bar dataKey="buy" stackId="r" fill="oklch(0.65 0.18 155)" />
            <Bar dataKey="hold" stackId="r" fill="var(--muted-foreground)" />
            <Bar dataKey="sell" stackId="r" fill="oklch(0.65 0.18 30)" />
            <Bar dataKey="strongSell" stackId="r" fill="var(--down)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-3 mt-2 text-[10px] font-mono text-muted-foreground flex-wrap">
        <Legend swatch="var(--up)" label="Strong Buy" />
        <Legend swatch="oklch(0.65 0.18 155)" label="Buy" />
        <Legend swatch="var(--muted-foreground)" label="Hold" />
        <Legend swatch="oklch(0.65 0.18 30)" label="Sell" />
        <Legend swatch="var(--down)" label="Strong Sell" />
      </div>
    </section>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="w-2.5 h-2.5 rounded"
        style={{ background: swatch }}
      />
      {label}
    </span>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono tabular-nums">{value}</dd>
    </div>
  );
}
