import { Link } from "wouter";
import { ArrowUpRight, Lock, PieChart, TrendingUp } from "lucide-react";

export default function Portfolio() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-500/20 flex items-center justify-center">
            <PieChart className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">내 포트폴리오</h1>
            <p className="text-xs text-muted-foreground">
              보유 종목 · 수익률 · 자산 배분 (로그인 필요)
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <section className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-8 text-center space-y-4">
          <Lock className="w-8 h-8 text-sky-400 mx-auto" />
          <div>
            <h2 className="text-base font-semibold">로그인이 필요합니다</h2>
            <p className="text-xs text-muted-foreground leading-relaxed mt-2 max-w-md mx-auto">
              개인 포트폴리오는 Supabase 인증 연결 후 사용할 수 있습니다.
              <br />
              백엔드 <code className="font-mono text-[11px] bg-card/60 px-1 rounded">/v1/portfolios/me</code> 는 이미 동작하며 거래 원장에서 평균단가 보유를 계산합니다.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-mono uppercase tracking-wide text-muted-foreground mb-3">
            연결 전에도 사용 가능한 화면
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Tile
              title="거장 13F 포트폴리오"
              description="등록된 거장의 분기별 보유 종목 + 비중 (실데이터)"
              href="/masters"
              accent="amber"
            />
            <Tile
              title="시장 변동 종목"
              description="US/KR 거래량·변동 상위 종목 실시간"
              href="/stocks"
              accent="emerald"
            />
            <Tile
              title="종목 상세"
              description="6개월 OHLCV 차트 + 밸류에이션 + 거장 보유"
              href="/stocks/AAPL"
              accent="violet"
            />
            <Tile
              title="시장 분석"
              description="매크로 · 시장 폭 · 심리 지표"
              href="/analysis"
              accent="sky"
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function Tile({
  title,
  description,
  href,
  accent,
}: {
  title: string;
  description: string;
  href: string;
  accent: "amber" | "emerald" | "violet" | "sky";
}) {
  const colorMap: Record<string, string> = {
    amber: "bg-amber-500/20 text-amber-400",
    emerald: "bg-emerald-500/20 text-emerald-400",
    violet: "bg-violet-500/20 text-violet-400",
    sky: "bg-sky-500/20 text-sky-400",
  };
  return (
    <Link href={href}>
      <article className="group rounded-xl border border-border/60 bg-card/40 p-5 hover:bg-card/70 transition-colors cursor-pointer">
        <header className="flex items-start justify-between mb-2 gap-3">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${colorMap[accent]}`}>
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </header>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed mt-1.5">
          {description}
        </p>
      </article>
    </Link>
  );
}
