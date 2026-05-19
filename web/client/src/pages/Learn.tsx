import { Link } from "wouter";
import { BookOpen, ChevronRight, Sparkles } from "lucide-react";

const PREVIEW_TOPICS = [
  {
    icon: "📈",
    title: "투자 기초",
    description:
      "주식·채권·ETF의 기본 개념, 호가창 읽기, 시장 구조와 거래 시간",
  },
  {
    icon: "🔍",
    title: "재무제표 읽기",
    description:
      "손익계산서·재무상태표·현금흐름표를 시간순으로 비교해 사업 체력 판단하기",
  },
  {
    icon: "🧮",
    title: "밸류에이션",
    description:
      "PER·PBR·EV/EBITDA·DCF — 산업별로 어떤 지표가 더 신뢰할 수 있는가",
  },
  {
    icon: "🏛️",
    title: "거장의 투자 철학",
    description:
      "버핏의 능력의 원, 클라먼의 안전 마진, 마크스의 사이클 — 실제 13F와 비교 학습",
  },
  {
    icon: "🌍",
    title: "매크로 경제",
    description:
      "연준 금리·CPI·고용지표가 자산 가격에 영향을 주는 경로",
  },
  {
    icon: "📊",
    title: "퀀트 전략 입문",
    description:
      "팩터 투자, 모멘텀·밸류·로우볼 — 백테스트로 가설을 검증하는 방법",
  },
];

export default function Learn() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-500/20 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">학습 센터</h1>
            <p className="text-xs text-muted-foreground">
              투자 의사결정에 필요한 개념을 체계적으로 정리합니다
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        <section className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-6 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-violet-300">
              학습 콘텐츠 준비 중
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1.5">
              아래 주제들로 강의가 준비 중입니다. 현재는 거장의 13F 보유 종목과
              실제 시장 데이터를 통해 같은 개념을 실습으로 익혀볼 수 있습니다.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Link href="/masters">
                <button className="px-3 py-1.5 rounded-md bg-violet-500/15 text-violet-300 text-xs font-medium border border-violet-500/30 hover:bg-violet-500/25 transition-colors">
                  거장 따라잡기 →
                </button>
              </Link>
              <Link href="/analysis">
                <button className="px-3 py-1.5 rounded-md bg-card/60 text-foreground text-xs font-medium border border-border/60 hover:bg-card transition-colors">
                  매크로 분석 →
                </button>
              </Link>
              <Link href="/reports">
                <button className="px-3 py-1.5 rounded-md bg-card/60 text-foreground text-xs font-medium border border-border/60 hover:bg-card transition-colors">
                  리서치 리포트 →
                </button>
              </Link>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-mono uppercase tracking-wide text-muted-foreground mb-4">
            예정된 주제
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PREVIEW_TOPICS.map((t) => (
              <article
                key={t.title}
                className="rounded-xl border border-border/60 bg-card/40 p-5 hover:bg-card/60 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className="text-2xl">{t.icon}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                </div>
                <h3 className="text-sm font-semibold">{t.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1.5">
                  {t.description}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
