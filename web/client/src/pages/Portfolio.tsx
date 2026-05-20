/**
 * Portfolio.tsx — Portfolio Tracker Page
 */
import { cn } from "@/lib/utils";
import { PORTFOLIO_HOLDINGS, PORTFOLIO_ALLOCATION, generatePortfolioChart } from "@/lib/data";
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, PlusCircle, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { toast } from "sonner";
import { useState } from "react";
import { AddTransactionDialog } from "@/components/AddTransactionDialog";
import { useAuth } from "@/contexts/AuthContext";

const COLORS = ["#38BDF8", "#A78BFA", "#FBBF24", "#34D399", "#94A3B8"];

function PctBadge({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-mono-num font-medium", up ? "text-up" : "text-down")}>
      {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {up ? "+" : ""}{value.toFixed(2)}%
    </span>
  );
}

const PERF_METRICS = [
  { label: "총 자산", value: "₩4,821만", sub: "+₩482만 (이번 달)", up: true },
  { label: "총 수익률", value: "+12.4%", sub: "원금 대비", up: true },
  { label: "시장 대비", value: "+4.2%p", sub: "KOSPI 대비 초과 수익", up: true },
  { label: "최대 낙폭", value: "-8.2%", sub: "2024년 8월", up: false },
];

export default function Portfolio() {
  const chartData = generatePortfolioChart(30);
  const { user } = useAuth();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-['Outfit']">내 포트폴리오</h1>
          <p className="text-sm text-muted-foreground mt-0.5">보유 종목 · 수익률 · 자산 배분 현황</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => {
              if (!user) { toast.info("로그인 후 거래 기록을 추가할 수 있습니다."); return; }
              setAddOpen(true);
            }}
          >
            <PlusCircle size={14} />종목 추가
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => toast.info("동기화 기능 준비 중입니다.")}>
            <RefreshCw size={14} />동기화
          </Button>
        </div>
      </div>

      {/* Performance metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {PERF_METRICS.map(m => (
          <div key={m.label} className="bg-card border border-border rounded-xl p-4">
            <div className="text-xs text-muted-foreground">{m.label}</div>
            <div className={cn("text-xl font-bold font-mono-num mt-1", m.up ? "text-up" : "text-down")}>{m.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Performance chart */}
        <div className="xl:col-span-3 bg-card border border-border rounded-xl p-5">
          <h2 className="text-base font-bold font-['Outfit'] mb-4">수익률 추이 (30일)</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 11 }} />
                <Line type="monotone" dataKey="portfolio" stroke="var(--sky)" strokeWidth={2} dot={false} name="포트폴리오" />
                <Line type="monotone" dataKey="kospi" stroke="var(--violet)" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="KOSPI" />
                <Line type="monotone" dataKey="sp500" stroke="var(--gold)" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="S&P 500" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Allocation pie */}
        <div className="xl:col-span-2 bg-card border border-border rounded-xl p-5">
          <h2 className="text-base font-bold font-['Outfit'] mb-4">자산 배분</h2>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={PORTFOLIO_ALLOCATION} dataKey="pct" nameKey="label"
                  cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2}>
                  {PORTFOLIO_ALLOCATION.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 11 }}
                  formatter={(v: number) => [`${v}%`, "비중"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-2">
            {PORTFOLIO_ALLOCATION.map((a, i) => (
              <div key={a.label} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-xs text-muted-foreground flex-1">{a.label}</span>
                <span className="text-xs font-mono-num font-medium">{a.pct}%</span>
                <span className="text-xs text-muted-foreground">{a.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Holdings table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="text-base font-bold font-['Outfit']">보유 종목</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                {["종목", "현재가", "등락률", "평가금액", "비중", "수익률"].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PORTFOLIO_HOLDINGS.map((h) => (
                <tr key={h.ticker} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4">
                    <Link href={`/stocks/${h.ticker}`}>
                      <div className="cursor-pointer">
                        <div className="font-bold text-sm font-mono-num hover:text-primary transition-colors">{h.ticker}</div>
                        <div className="text-xs text-muted-foreground">{h.name}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="py-3 px-4 font-mono-num text-sm">—</td>
                  <td className="py-3 px-4"><PctBadge value={h.changePct} /></td>
                  <td className="py-3 px-4 font-mono-num text-sm">{h.value}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                        <div className="h-full bg-primary/60 rounded-full" style={{ width: `${h.weight * 4}%` }} />
                      </div>
                      <span className="text-xs font-mono-num">{h.weight}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={cn("text-sm font-mono-num font-bold",
                      h.changePct >= 0 ? "text-up" : "text-down"
                    )}>
                      {h.changePct >= 0 ? "+" : ""}{(h.changePct * 0.8).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <AddTransactionDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={() => toast.success("포트폴리오가 갱신될 예정입니다 (새로고침 시 반영).")}
      />
    </div>
  );
}
