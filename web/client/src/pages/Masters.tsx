import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Award, ChevronRight, Loader2, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useMastersList } from "@/features/masters";
import type { MasterSummary } from "@/features/masters";

function formatAum(m: MasterSummary): string {
  if (m.aum == null) return "—";
  const cur = m.aum_currency ?? "USD";
  if (m.aum >= 1e12) return `${cur} ${(m.aum / 1e12).toFixed(2)}T`;
  if (m.aum >= 1e9) return `${cur} ${(m.aum / 1e9).toFixed(1)}B`;
  if (m.aum >= 1e6) return `${cur} ${(m.aum / 1e6).toFixed(1)}M`;
  return `${cur} ${m.aum.toLocaleString()}`;
}

export default function Masters() {
  const { data, loading, error } = useMastersList();
  const [query, setQuery] = useState("");

  const styles = useMemo(() => {
    const set = new Set<string>();
    (data ?? []).forEach((m) => {
      if (m.style) set.add(m.style);
    });
    return ["전체", ...Array.from(set).sort()];
  }, [data]);

  const [styleFilter, setStyleFilter] = useState("전체");

  const masters = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter((m) => {
      if (styleFilter !== "전체" && m.style !== styleFilter) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        (m.firm ?? "").toLowerCase().includes(q)
      );
    });
  }, [data, styleFilter, query]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold tracking-tight">고수 따라잡기</h1>
            <p className="text-xs text-muted-foreground">
              세계 최고 투자자들의 전략과 보유 종목을 확인합니다
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            {data ? `${data.length}명` : ""}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="이름·운용사 검색"
              className="w-full pl-9 pr-3 py-2 rounded-md bg-card/60 border border-border/60 text-sm focus:outline-none focus:border-emerald-500/60"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {styles.map((s) => (
              <button
                key={s}
                onClick={() => setStyleFilter(s)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                  styleFilter === s
                    ? "border-emerald-500 text-emerald-400 bg-emerald-500/10"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-12">
            <Loader2 className="w-4 h-4 animate-spin" />
            거장 목록을 불러오는 중…
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            거장 목록을 불러오지 못했습니다. ({error.message})
          </div>
        )}

        {!loading && !error && masters.length === 0 && (
          <div className="rounded-lg border border-border/50 bg-card/30 p-10 text-center text-sm text-muted-foreground">
            조건에 맞는 거장이 없습니다.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {masters.map((m) => (
            <Link key={m.id} href={`/masters/${m.slug}`}>
              <article className="group rounded-xl border border-border/60 bg-card/60 hover:bg-card hover:border-emerald-500/40 transition-all p-5 cursor-pointer h-full">
                <header className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="font-semibold text-base leading-tight">
                      {m.name}
                    </h2>
                    {m.firm && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {m.firm}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-emerald-400 transition-colors" />
                </header>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  {m.country_code && (
                    <Badge variant="outline" className="font-mono">
                      {m.country_code}
                    </Badge>
                  )}
                  {m.style && <Badge variant="secondary">{m.style}</Badge>}
                </div>
                <dl className="mt-4 text-xs space-y-1.5">
                  <div className="flex justify-between text-muted-foreground">
                    <dt>AUM</dt>
                    <dd className="font-mono text-foreground">{formatAum(m)}</dd>
                  </div>
                </dl>
              </article>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
