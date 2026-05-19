import { Link } from "wouter";
import {
  AlertCircle,
  ArrowUpRight,
  Calendar as CalendarIcon,
  Loader2,
  Newspaper,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useNewsList } from "@/features/news";
import { useEconomicEvents } from "@/features/events";
import { useMacroIndicators } from "@/features/macros";
import { useMovers } from "@/features/movers";
import { useBreadth } from "@/features/market";
import { useNotices } from "@/features/notices";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-xl font-bold tracking-tight">Finance Lab</h1>
          <p className="text-xs text-muted-foreground mt-1">
            매크로 · 시장 폭 · 거래 활발 종목 · 뉴스 한눈에
          </p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <NoticesStrip />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <BreadthCard market="US" />
          <BreadthCard market="KR" />
          <MacroCard />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <MoversCard market="US" />
          <MoversCard market="KR" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <NewsCard />
          <EventsCard />
        </div>
      </div>
    </div>
  );
}

function CardShell({
  title,
  icon,
  href,
  children,
  accent,
}: {
  title: string;
  icon: React.ReactNode;
  href?: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <section className="rounded-xl border border-border/60 bg-card/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              accent ?? "bg-muted/40 text-muted-foreground"
            }`}
          >
            {icon}
          </div>
          <h2 className="text-sm font-semibold">{title}</h2>
        </div>
        {href && (
          <Link href={href}>
            <button className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-0.5">
              모두 보기
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function BreadthCard({ market }: { market: "US" | "KR" }) {
  const { data, loading } = useBreadth(market);
  const accent =
    market === "US"
      ? "bg-emerald-500/20 text-emerald-400"
      : "bg-sky-500/20 text-sky-400";

  return (
    <CardShell
      title={`${market} 시장 폭`}
      icon={<TrendingUp className="w-4 h-4" />}
      accent={accent}
    >
      {loading || !data ? (
        <SkeletonBlock />
      ) : (
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-mono font-semibold">
              {data.score.toFixed(0)}
            </span>
            <span className="text-xs text-muted-foreground">/ 100</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            상승 {data.rising} · 하락 {data.falling} · 보합 {data.flat} (총{" "}
            {data.total})
          </p>
          <div className="mt-3 grid grid-cols-10 gap-px rounded overflow-hidden">
            {data.cells.slice(0, 30).map((c) => (
              <div
                key={c.symbol}
                title={`${c.symbol} ${c.change_pct.toFixed(2)}%`}
                className={`aspect-square ${
                  c.change_pct > 0
                    ? "bg-up/70"
                    : c.change_pct < 0
                    ? "bg-down/70"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </CardShell>
  );
}

function MacroCard() {
  const { data, loading } = useMacroIndicators();
  return (
    <CardShell
      title="매크로 지표"
      icon={<TrendingUp className="w-4 h-4" />}
      accent="bg-violet-500/20 text-violet-400"
    >
      {loading || !data ? (
        <SkeletonBlock />
      ) : (
        <ul className="space-y-2">
          {data.slice(0, 5).map((m) => {
            const up = (m.change ?? 0) > 0;
            const down = (m.change ?? 0) < 0;
            return (
              <li
                key={m.series_id}
                className="flex items-center justify-between text-xs"
              >
                <span className="truncate max-w-[60%]">{m.label}</span>
                <span className="flex items-baseline gap-2 font-mono">
                  <span>
                    {m.value ?? "—"}
                    {m.unit ?? ""}
                  </span>
                  {m.change != null && (
                    <span
                      className={
                        up
                          ? "text-up"
                          : down
                          ? "text-down"
                          : "text-muted-foreground"
                      }
                    >
                      {up ? "+" : ""}
                      {m.change.toFixed(2)}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </CardShell>
  );
}

function MoversCard({ market }: { market: "US" | "KR" }) {
  const { data, loading } = useMovers({ market, limit: 8 });
  return (
    <CardShell
      title={`${market} 변동 상위`}
      icon={<TrendingUp className="w-4 h-4" />}
      href="/stocks"
      accent="bg-amber-500/20 text-amber-400"
    >
      {loading || !data ? (
        <SkeletonBlock />
      ) : (
        <ul className="divide-y divide-border/40">
          {data.items.map((m) => {
            const up = m.change_pct >= 0;
            return (
              <li key={m.symbol}>
                <Link href={`/stocks/${m.symbol}`}>
                  <div className="flex items-center justify-between py-2 text-xs hover:bg-card/40 transition-colors cursor-pointer px-1">
                    <span className="font-mono font-semibold">{m.symbol}</span>
                    <span className="flex-1 mx-3 text-muted-foreground truncate">
                      {m.name}
                    </span>
                    <span
                      className={`font-mono flex items-center gap-1 ${
                        up ? "text-up" : "text-down"
                      }`}
                    >
                      {up ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {up ? "+" : ""}
                      {m.change_pct.toFixed(2)}%
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </CardShell>
  );
}

function NewsCard() {
  const { data, loading } = useNewsList({ limit: 8 });
  return (
    <CardShell
      title="시장 뉴스"
      icon={<Newspaper className="w-4 h-4" />}
      href="/news"
      accent="bg-sky-500/20 text-sky-400"
    >
      {loading || !data ? (
        <SkeletonBlock />
      ) : (
        <ul className="space-y-2">
          {data.slice(0, 6).map((n) => (
            <li key={n.id} className="text-xs">
              <a
                href={n.url ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="block hover:bg-card/40 rounded p-1.5 -mx-1.5 transition-colors"
              >
                <p className="leading-snug line-clamp-2">{n.title}</p>
                <p className="text-[10px] text-muted-foreground font-mono mt-1">
                  {n.source} · {(n.published_at ?? "").slice(0, 16)}
                </p>
              </a>
            </li>
          ))}
        </ul>
      )}
    </CardShell>
  );
}

function EventsCard() {
  const { data, loading } = useEconomicEvents();
  return (
    <CardShell
      title="경제 이벤트"
      icon={<CalendarIcon className="w-4 h-4" />}
      href="/calendar"
      accent="bg-gold/20 text-gold"
    >
      {loading || !data ? (
        <SkeletonBlock />
      ) : (
        <ul className="space-y-2">
          {data.slice(0, 8).map((e, i) => (
            <li
              key={`${e.time}-${i}`}
              className="grid grid-cols-[80px_44px_1fr] gap-2 text-xs items-center"
            >
              <span className="font-mono text-muted-foreground">
                {e.time.slice(5, 16)}
              </span>
              <Badge
                variant="outline"
                className="font-mono text-[10px] justify-center"
              >
                {e.country}
              </Badge>
              <span className="truncate">{e.event}</span>
            </li>
          ))}
        </ul>
      )}
    </CardShell>
  );
}

function NoticesStrip() {
  const { data } = useNotices();
  if (!data || data.length === 0) return null;
  const pinned = data.find((n) => n.is_pinned) ?? data[0];
  return (
    <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
      <AlertCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="text-[10px]">
            {pinned.tag}
          </Badge>
          <p className="text-sm font-medium truncate">{pinned.title}</p>
        </div>
        {pinned.description && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {pinned.description}
          </p>
        )}
      </div>
    </div>
  );
}

function SkeletonBlock() {
  return (
    <div className="flex items-center justify-center py-6 text-muted-foreground">
      <Loader2 className="w-4 h-4 animate-spin" />
    </div>
  );
}
