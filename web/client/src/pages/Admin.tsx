import { Link } from "wouter";
import { Lock, Shield, Sparkles } from "lucide-react";

export default function Admin() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">관리자</h1>
            <p className="text-xs text-muted-foreground">
              운영자 도구 (Supabase 인증 + admin claim 필요)
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <section className="rounded-xl border border-primary/30 bg-primary/5 p-8 text-center space-y-5">
          <Lock className="w-8 h-8 text-primary mx-auto" />
          <div>
            <h2 className="text-base font-semibold">관리자 페이지 준비 중</h2>
            <p className="text-xs text-muted-foreground leading-relaxed mt-2 max-w-md mx-auto">
              사용자 관리 · 콘텐츠 관리 · 데이터 수집 모니터링은 Supabase 인증과
              관리자 권한 클레임이 연결된 후 활성화됩니다. 그 동안 데이터
              파이프라인 상태는 Supabase Studio + Vercel cron 로그로 직접
              확인하세요.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground font-mono">
            <Sparkles className="w-3.5 h-3.5" />
            cron 스케줄은 <code className="bg-card/60 px-1 rounded">vercel.json</code> 참고
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link href="/masters">
            <div className="rounded-lg border border-border/60 bg-card/40 p-4 hover:bg-card/60 cursor-pointer transition-colors">
              <div className="text-sm font-medium">거장 목록</div>
              <div className="text-[11px] text-muted-foreground mt-1">
                public read
              </div>
            </div>
          </Link>
          <Link href="/reports">
            <div className="rounded-lg border border-border/60 bg-card/40 p-4 hover:bg-card/60 cursor-pointer transition-colors">
              <div className="text-sm font-medium">리포트 목록</div>
              <div className="text-[11px] text-muted-foreground mt-1">
                public read
              </div>
            </div>
          </Link>
          <Link href="/news">
            <div className="rounded-lg border border-border/60 bg-card/40 p-4 hover:bg-card/60 cursor-pointer transition-colors">
              <div className="text-sm font-medium">뉴스 피드</div>
              <div className="text-[11px] text-muted-foreground mt-1">
                public read
              </div>
            </div>
          </Link>
        </section>
      </div>
    </div>
  );
}
