import { Link, useLocation } from "wouter";
import { ArrowRight, Home } from "lucide-react";

const QUICK_LINKS = [
  { href: "/", label: "홈 대시보드" },
  { href: "/masters", label: "거장 따라잡기" },
  { href: "/stocks", label: "변동 종목" },
  { href: "/reports", label: "리서치 리포트" },
  { href: "/news", label: "시장 뉴스" },
  { href: "/analysis", label: "시장 분석" },
];

export default function NotFound() {
  const [location] = useLocation();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 text-center px-4">
      <div className="text-7xl sm:text-8xl font-bold font-mono text-muted-foreground/20 leading-none">
        404
      </div>
      <div>
        <h1 className="text-xl font-bold">페이지를 찾을 수 없습니다</h1>
        <p className="text-xs text-muted-foreground mt-2 font-mono">
          요청 경로: <span className="text-foreground">{location}</span>
        </p>
      </div>

      <Link href="/">
        <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90">
          <Home className="w-3.5 h-3.5" />
          홈으로 돌아가기
        </button>
      </Link>

      <div className="w-full max-w-md mt-4 grid grid-cols-2 gap-2">
        {QUICK_LINKS.map((q) => (
          <Link key={q.href} href={q.href}>
            <div className="group flex items-center justify-between px-3 py-2 rounded-md border border-border/60 bg-card/40 hover:bg-card/70 cursor-pointer transition-colors text-xs">
              <span>{q.label}</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
