import { useMemo, useState } from "react";
import { FileText, Loader2, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useReportsList } from "@/features/reports";
import type { ReportSummary } from "@/features/reports";

const ALL = "전체";

function importanceBadge(n: number | null) {
  if (n == null) return null;
  const filled = "★".repeat(n);
  const empty = "☆".repeat(Math.max(0, 5 - n));
  return (
    <span className="font-mono text-[10px] text-amber-400">
      {filled}
      <span className="text-muted-foreground">{empty}</span>
    </span>
  );
}

export default function Reports() {
  const [category, setCategory] = useState(ALL);
  const [query, setQuery] = useState("");

  const { data, loading, error } = useReportsList({ limit: 100 });

  const categories = useMemo(() => {
    const set = new Set<string>();
    (data ?? []).forEach((r) => r.category && set.add(r.category));
    return [ALL, ...Array.from(set).sort()];
  }, [data]);

  const reports = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter((r) => {
      if (category !== ALL && r.category !== category) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.source.toLowerCase().includes(q)
      );
    });
  }, [data, category, query]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-500/20 flex items-center justify-center">
            <FileText className="w-4 h-4 text-violet-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold tracking-tight">리서치 리포트</h1>
            <p className="text-xs text-muted-foreground">
              주요 리서치 기관·증권사·정책기관 보고서
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            {data ? `${data.length}건` : ""}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="제목·발행처 검색"
              className="w-full pl-9 pr-3 py-2 rounded-md bg-card/60 border border-border/60 text-sm focus:outline-none focus:border-violet-500/60"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                  category === c
                    ? "border-violet-500 text-violet-400 bg-violet-500/10"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-12">
            <Loader2 className="w-4 h-4 animate-spin" />
            리포트를 불러오는 중…
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            리포트를 불러오지 못했습니다. ({error.message})
          </div>
        )}

        {!loading && !error && reports.length === 0 && (
          <div className="rounded-lg border border-border/50 bg-card/30 p-10 text-center text-sm text-muted-foreground">
            조건에 맞는 리포트가 없습니다.
          </div>
        )}

        <ul className="space-y-2">
          {reports.map((r) => (
            <ReportRow key={r.id} report={r} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function ReportRow({ report }: { report: ReportSummary }) {
  return (
    <li className="rounded-lg border border-border/60 bg-card/60 hover:bg-card hover:border-violet-500/30 transition-colors p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium leading-snug">{report.title}</h3>
          <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-muted-foreground">
            <span className="font-mono uppercase">{report.source}</span>
            {report.category && (
              <Badge variant="outline" className="text-[10px]">
                {report.category}
              </Badge>
            )}
            {report.language && (
              <span className="font-mono uppercase text-muted-foreground">
                {report.language}
              </span>
            )}
            {report.published_at && <span>· {report.published_at}</span>}
          </div>
        </div>
        <div className="flex-shrink-0">{importanceBadge(report.importance)}</div>
      </div>
    </li>
  );
}
