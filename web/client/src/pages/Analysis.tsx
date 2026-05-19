import { useMemo, useState } from "react";
import {
  Activity,
  BarChart2,
  Gauge,
  Globe,
  Loader2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useMacroIndicators } from "@/features/macros";
import type { MacroIndicator } from "@/features/macros";
import { useBreadth } from "@/features/market";
import { useFearGreed } from "@/features/sentiment";
import type { FearGreedItem } from "@/features/sentiment";

type Tab = "overview" | "macros" | "breadth" | "sentiment";

const TABS: { id: Tab; label: string; icon: typeof Activity }[] = [
  { id: "overview", label: "개요", icon: Activity },
  { id: "macros", label: "매크로", icon: TrendingUp },
  { id: "breadth", label: "시장 폭", icon: BarChart2 },
  { id: "sentiment", label: "심리 지표", icon: Gauge },
];

export default function Analysis() {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-500/20 flex items-center justify-center">
            <BarChart2 className="w-4 h-4 text-violet-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold tracking-tight">시장 분석</h1>
            <p className="text-xs text-muted-foreground">
              매크로 · 시장 폭 · 투자 심리 지표
            </p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                  active
                    ? "border-violet-500 text-violet-400"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {tab === "overview" && <OverviewTab />}
        {tab === "macros" && <MacrosTab />}
        {tab === "breadth" && <BreadthTab />}
        {tab === "sentiment" && <SentimentTab />}
      </div>
    </div>
  );
}

// ── Overview ────────────────────────────────────────────────────────────────

function OverviewTab() {
  return (
    <div className="space-y-6">
      <SentimentSection compact />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BreadthGauge market="US" compact />
        <BreadthGauge market="KR" compact />
      </div>
      <MacrosTable limit={8} />
    </div>
  );
}

// ── Macros tab ──────────────────────────────────────────────────────────────

function MacrosTab() {
  const [country, setCountry] = useState<"전체" | "US" | "KR">("전체");
  const { data, loading, error } = useMacroIndicators();

  const filtered = useMemo(() => {
    if (!data) return [];
    if (country === "전체") return data;
    return data.filter((m) => m.country_code === country);
  }, [data, country]);

  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {(["전체", "US", "KR"] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCountry(c)}
            className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
              country === c
                ? "border-violet-500 text-violet-400 bg-violet-500/10"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <Loadable loading={loading} error={error} empty={filtered.length === 0}>
        <MacrosTable rows={filtered} />
      </Loadable>
    </>
  );
}

function MacrosTable({
  rows,
  limit,
}: {
  rows?: MacroIndicator[];
  limit?: number;
}) {
  const { data, loading } = useMacroIndicators();
  const list = rows ?? data ?? [];
  const sliced = limit ? list.slice(0, limit) : list;

  if (loading && !rows) {
    return <SkeletonRow />;
  }

  return (
    <section>
      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full text-xs">
          <thead className="bg-card/40 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">지표</th>
              <th className="px-3 py-2 text-center font-medium">국가</th>
              <th className="px-3 py-2 text-right font-medium">최근값</th>
              <th className="px-3 py-2 text-right font-medium">이전</th>
              <th className="px-3 py-2 text-right font-medium">변화</th>
              <th className="px-3 py-2 text-right font-medium">기준일</th>
            </tr>
          </thead>
          <tbody>
            {sliced.map((m) => {
              const up = (m.change ?? 0) > 0;
              const down = (m.change ?? 0) < 0;
              return (
                <tr
                  key={m.series_id}
                  className="border-t border-border/40 hover:bg-card/40 tabular-nums font-mono"
                >
                  <td className="px-3 py-1.5 font-sans">
                    <div className="font-medium">{m.label}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {m.series_id}
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {m.country_code}
                    </Badge>
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    {m.value ?? "—"}
                    {m.unit ?? ""}
                  </td>
                  <td className="px-3 py-1.5 text-right text-muted-foreground">
                    {m.previous_value ?? "—"}
                    {m.unit ?? ""}
                  </td>
                  <td
                    className={`px-3 py-1.5 text-right ${
                      up ? "text-up" : down ? "text-down" : ""
                    }`}
                  >
                    {m.change != null
                      ? `${up ? "+" : ""}${m.change.toFixed(2)}`
                      : "—"}
                  </td>
                  <td className="px-3 py-1.5 text-right text-muted-foreground">
                    {m.date}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ── Breadth tab ─────────────────────────────────────────────────────────────

function BreadthTab() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <BreadthGauge market="US" />
      <BreadthGauge market="KR" />
    </div>
  );
}

function BreadthGauge({
  market,
  compact = false,
}: {
  market: "US" | "KR";
  compact?: boolean;
}) {
  const { data, loading, error } = useBreadth(market);
  if (loading) return <SkeletonRow />;
  if (error || !data) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        {error?.message ?? "데이터 없음"}
      </div>
    );
  }
  const score = data.score;
  const cells = compact ? data.cells.slice(0, 60) : data.cells;
  const cols = compact ? 12 : 16;

  return (
    <section className="rounded-xl border border-border/60 bg-card/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">{market} 시장 폭</h2>
        </div>
        <div className="text-right">
          <div className="text-3xl font-mono font-semibold leading-none">
            {score.toFixed(0)}
            <span className="text-xs text-muted-foreground ml-1">/100</span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            ↑ {data.rising} · ↓ {data.falling} · = {data.flat}
          </div>
        </div>
      </div>
      <div
        className="grid gap-px rounded overflow-hidden"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}
      >
        {cells.map((c) => (
          <div
            key={c.symbol}
            title={`${c.symbol} ${c.change_pct.toFixed(2)}% (${c.last})`}
            className={`aspect-square ${
              c.change_pct > 1
                ? "bg-up"
                : c.change_pct > 0
                ? "bg-up/60"
                : c.change_pct < -1
                ? "bg-down"
                : c.change_pct < 0
                ? "bg-down/60"
                : "bg-muted"
            }`}
          />
        ))}
      </div>
      {!compact && (
        <p className="text-[10px] text-muted-foreground mt-2 font-mono">
          전체 {data.total} 종목 · 셀에 마우스 올리면 종목명 표시
        </p>
      )}
    </section>
  );
}

// ── Sentiment tab ───────────────────────────────────────────────────────────

function SentimentTab() {
  const { data, loading } = useFearGreed();
  if (loading) return <SkeletonRow />;
  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/30 p-10 text-center text-sm text-muted-foreground">
        심리 지표 데이터가 없습니다.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {data.map((it) => (
        <FearGreedFull key={it.market_code} item={it} />
      ))}
    </div>
  );
}

function SentimentSection({ compact }: { compact?: boolean }) {
  const { data, loading } = useFearGreed();
  if (loading) return <SkeletonRow />;
  if (!data) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {data.map((it) => (
        <FearGreedFull key={it.market_code} item={it} compact={compact} />
      ))}
    </div>
  );
}

function FearGreedFull({
  item,
  compact = false,
}: {
  item: FearGreedItem;
  compact?: boolean;
}) {
  const v = Math.max(0, Math.min(100, item.value));
  const color =
    v >= 75
      ? "var(--up)"
      : v >= 55
      ? "oklch(0.72 0.18 110)"
      : v >= 45
      ? "var(--muted-foreground)"
      : v >= 25
      ? "oklch(0.65 0.18 30)"
      : "var(--down)";
  const angle = (v / 100) * 180 - 90;
  const rad = (angle * Math.PI) / 180;
  const x = 50 + 40 * Math.cos(rad);
  const y = 50 + 40 * Math.sin(rad);

  return (
    <section className="rounded-xl border border-border/60 bg-card/60 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Gauge className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">
          {item.market} Fear & Greed
        </h2>
        <Badge
          variant="outline"
          className="text-[10px] uppercase font-mono"
          style={{ color, borderColor: color }}
        >
          {item.label}
        </Badge>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative w-32 h-20 flex-shrink-0">
          <svg viewBox="0 0 100 60" className="w-full h-full">
            <path
              d="M 10 50 A 40 40 0 0 1 90 50"
              stroke="var(--border)"
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d={`M 10 50 A 40 40 0 0 1 ${x} ${y}`}
              stroke={color}
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
            <span
              className="text-2xl font-mono font-bold leading-none"
              style={{ color }}
            >
              {v.toFixed(0)}
            </span>
          </div>
        </div>
        <div className="flex-1 min-w-0 grid grid-cols-2 gap-y-1.5 text-xs font-mono">
          <Compare label="전일" prev={item.previous_close} current={v} />
          <Compare label="1주 전" prev={item.previous_1_week} current={v} />
          <Compare label="1달 전" prev={item.previous_1_month} current={v} />
          {!compact && (
            <Compare label="1년 전" prev={item.previous_1_year} current={v} />
          )}
        </div>
      </div>
      {!compact && (
        <p className="text-[10px] text-muted-foreground mt-3">
          0 (extreme fear) — 100 (extreme greed). 갱신:{" "}
          {item.timestamp.slice(0, 16).replace("T", " ")}
        </p>
      )}
    </section>
  );
}

function Compare({
  label,
  prev,
  current,
}: {
  label: string;
  prev: number | null;
  current: number;
}) {
  const delta = prev != null ? current - prev : null;
  const up = (delta ?? 0) > 0;
  const down = (delta ?? 0) < 0;
  return (
    <>
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">
        {prev != null ? prev.toFixed(1) : "—"}
        {delta != null && (
          <span
            className={`ml-2 ${up ? "text-up" : down ? "text-down" : ""}`}
          >
            {up ? "+" : ""}
            {delta.toFixed(1)}
          </span>
        )}
      </span>
    </>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function Loadable({
  loading,
  error,
  empty,
  children,
}: {
  loading: boolean;
  error: Error | null;
  empty: boolean;
  children: React.ReactNode;
}) {
  if (loading) return <SkeletonRow />;
  if (error)
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        {error.message}
      </div>
    );
  if (empty)
    return (
      <div className="rounded-lg border border-border/50 bg-card/30 p-10 text-center text-sm text-muted-foreground">
        조건에 맞는 데이터가 없습니다.
      </div>
    );
  return <>{children}</>;
}

function SkeletonRow() {
  return (
    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-12">
      <Loader2 className="w-4 h-4 animate-spin" />
      불러오는 중…
    </div>
  );
}

// Avoid unused warnings for compact-mode color lookup tokens (TrendingDown imported for legibility/consistency)
void TrendingDown;
