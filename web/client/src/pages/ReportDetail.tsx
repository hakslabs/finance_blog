import { Link, useParams } from "wouter";
import { ArrowLeft, ExternalLink, FileText, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useReportDetail } from "@/features/reports";

function importanceBadge(n: number | null) {
  if (n == null) return null;
  const filled = "★".repeat(n);
  const empty = "☆".repeat(Math.max(0, 5 - n));
  return (
    <span className="font-mono text-xs text-amber-400">
      {filled}
      <span className="text-muted-foreground">{empty}</span>
    </span>
  );
}

export default function ReportDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error } = useReportDetail(id);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        리포트를 불러오는 중…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-destructive">
          {error?.message ?? "리포트를 찾을 수 없습니다."}
        </p>
        <Link href="/reports">
          <button className="text-xs text-violet-400 hover:underline">
            ← 리포트 목록으로
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/reports">
            <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-card transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          <div className="w-9 h-9 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold leading-tight truncate">
              {data.title}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono uppercase">
              {data.source}
            </p>
          </div>
          {importanceBadge(data.importance)}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <section className="flex flex-wrap items-center gap-2 text-xs">
          {data.category && (
            <Badge variant="outline" className="text-[11px]">
              {data.category}
            </Badge>
          )}
          {data.language && (
            <Badge variant="outline" className="font-mono uppercase text-[10px]">
              {data.language}
            </Badge>
          )}
          {data.published_at && (
            <span className="text-muted-foreground font-mono">
              발행 {data.published_at}
            </span>
          )}
        </section>

        {data.summary && (
          <section className="rounded-xl border border-border/60 bg-card/60 p-5">
            <h2 className="text-xs font-mono uppercase tracking-wide text-muted-foreground mb-2">
              요약
            </h2>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {data.summary}
            </p>
          </section>
        )}

        {data.body_url && (
          <section>
            <a
              href={data.body_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-violet-500/10 border border-violet-500/40 text-sm text-violet-400 hover:bg-violet-500/20 transition-colors"
            >
              원문 보기
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <p className="text-[11px] text-muted-foreground mt-2">
              발행처: {data.source}
            </p>
          </section>
        )}

        {!data.summary && !data.body_url && (
          <div className="rounded-lg border border-border/50 bg-card/30 p-10 text-center text-sm text-muted-foreground">
            본문 또는 원문 링크가 등록되지 않았습니다.
          </div>
        )}
      </div>
    </div>
  );
}
