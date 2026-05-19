import { Link, useParams } from "wouter";
import { ArrowLeft, BookOpen, Sparkles } from "lucide-react";

export default function LearnDetail() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/learn">
            <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-card transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          <div className="w-9 h-9 rounded-lg bg-violet-500/20 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold">강의 상세</h1>
            {id && (
              <p className="text-[11px] text-muted-foreground font-mono">
                lesson: {id}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <section className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-8 text-center space-y-4">
          <Sparkles className="w-8 h-8 text-violet-400 mx-auto" />
          <div>
            <h2 className="text-base font-semibold">
              이 강의는 아직 준비 중입니다
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed mt-2 max-w-md mx-auto">
              학습 콘텐츠는 거장의 13F 보유 종목 분석과 매크로 지표 해설을
              엮어 곧 공개됩니다. 그 동안은 실제 데이터로 직접 학습해보세요.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <Link href="/masters">
              <button className="px-3 py-1.5 rounded-md bg-violet-500/15 text-violet-300 text-xs font-medium border border-violet-500/30 hover:bg-violet-500/25 transition-colors">
                거장 따라잡기
              </button>
            </Link>
            <Link href="/analysis">
              <button className="px-3 py-1.5 rounded-md bg-card/60 text-foreground text-xs font-medium border border-border/60 hover:bg-card transition-colors">
                매크로 분석
              </button>
            </Link>
            <Link href="/learn">
              <button className="px-3 py-1.5 rounded-md bg-card/60 text-foreground text-xs font-medium border border-border/60 hover:bg-card transition-colors">
                학습 센터로
              </button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
