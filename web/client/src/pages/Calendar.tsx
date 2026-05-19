import { useMemo, useState } from "react";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useEconomicEvents } from "@/features/events";
import type { EconomicEvent } from "@/features/events";

const IMPACT_COLOR: Record<string, string> = {
  high: "text-red-400 border-red-500/40 bg-red-500/10",
  medium: "text-amber-400 border-amber-500/40 bg-amber-500/10",
  low: "text-muted-foreground border-border bg-card/40",
};

function fmtNum(n: number | null, unit: string | null): string {
  if (n == null) return "—";
  return `${n}${unit ?? ""}`;
}

function groupByDay(items: EconomicEvent[]): [string, EconomicEvent[]][] {
  const map = new Map<string, EconomicEvent[]>();
  for (const e of items) {
    const day = e.time.slice(0, 10);
    const arr = map.get(day) ?? [];
    arr.push(e);
    map.set(day, arr);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
}

export default function CalendarPage() {
  const [countryFilter, setCountryFilter] = useState("전체");
  const { data, loading, error } = useEconomicEvents();

  const countries = useMemo(() => {
    const set = new Set<string>();
    (data ?? []).forEach((e) => set.add(e.country));
    return ["전체", ...Array.from(set).sort()];
  }, [data]);

  const grouped = useMemo(() => {
    const filtered =
      countryFilter === "전체"
        ? data ?? []
        : (data ?? []).filter((e) => e.country === countryFilter);
    return groupByDay(filtered);
  }, [data, countryFilter]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gold/20 flex items-center justify-center">
            <CalendarIcon className="w-4 h-4 text-gold" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold tracking-tight">경제 이벤트</h1>
            <p className="text-xs text-muted-foreground">
              FOMC·CPI·고용 지표 등 주요 매크로 일정
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            {data ? `${data.length}건` : ""}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        <div className="flex flex-wrap gap-1.5">
          {countries.map((c) => (
            <button
              key={c}
              onClick={() => setCountryFilter(c)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                countryFilter === c
                  ? "border-gold text-gold bg-gold/10"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-12">
            <Loader2 className="w-4 h-4 animate-spin" />
            일정을 불러오는 중…
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            일정을 불러오지 못했습니다. ({error.message})
          </div>
        )}

        {!loading && !error && grouped.length === 0 && (
          <div className="rounded-lg border border-border/50 bg-card/30 p-10 text-center text-sm text-muted-foreground">
            표시할 이벤트가 없습니다.
          </div>
        )}

        {grouped.map(([day, events]) => (
          <section key={day}>
            <h2 className="text-xs font-mono uppercase tracking-wide text-muted-foreground mb-2">
              {day}
            </h2>
            <ul className="rounded-lg border border-border/60 overflow-hidden">
              {events.map((e, i) => (
                <li
                  key={`${day}-${i}-${e.event}`}
                  className="grid grid-cols-[64px_44px_1fr_auto] gap-3 items-center px-3 py-2.5 border-b border-border/40 last:border-b-0 bg-card/40 hover:bg-card/70 transition-colors text-xs"
                >
                  <span className="font-mono text-muted-foreground">
                    {e.time.slice(11, 16)}
                  </span>
                  <Badge variant="outline" className="font-mono text-[10px] justify-center">
                    {e.country}
                  </Badge>
                  <span className="truncate">{e.event}</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] border ${
                        IMPACT_COLOR[e.impact] ?? IMPACT_COLOR.low
                      }`}
                    >
                      {e.impact}
                    </span>
                    <span className="text-right tabular-nums w-16">
                      {fmtNum(e.actual, e.unit)}
                    </span>
                    <span className="text-muted-foreground text-right tabular-nums w-14">
                      {fmtNum(e.prev, e.unit)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
