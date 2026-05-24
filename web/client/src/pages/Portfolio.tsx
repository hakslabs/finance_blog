/**
 * Portfolio.tsx — Portfolio Tracker Page
 */
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, PlusCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { toast } from "sonner";
import { AddTransactionDialog } from "@/components/AddTransactionDialog";
import {
  usePortfolioHistory,
  usePortfolioSnapshot,
} from "@/features/portfolio";
import KLineSeriesChart from "@/components/KLineSeriesChart";

const COLORS = ["#38BDF8", "#A78BFA", "#FBBF24", "#34D399", "#94A3B8"];
const PORTFOLIO_HISTORY_DAYS = 1825;

function PctBadge({ value }: { value: number | null | undefined }) {
  const numeric = value ?? 0;
  const up = numeric >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-mono-num font-medium",
        up ? "text-up" : "text-down",
      )}
    >
      {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {up ? "+" : ""}
      {value == null ? "—" : `${numeric.toFixed(2)}%`}
    </span>
  );
}

function fmtMoney(value: number | null | undefined, currency = "KRW") {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "KRW" ? 0 : 2,
  }).format(value);
}

function fmtSignedMoney(value: number | null | undefined, currency = "KRW") {
  if (value == null || !Number.isFinite(value)) return "—";
  const abs = fmtMoney(Math.abs(value), currency);
  return `${value >= 0 ? "+" : "-"}${abs}`;
}

type PortfolioPoint = {
  date: string;
  portfolio: number | null;
  cost: number | null;
};

export default function Portfolio() {
  const [addOpen, setAddOpen] = useState(false);
  const {
    data: snapshot,
    refetch: refetchSnapshot,
    loading: snapshotLoading,
  } = usePortfolioSnapshot();
  const {
    data: history,
    refetch: refetchHistory,
    loading: performanceLoading,
  } = usePortfolioHistory(PORTFOLIO_HISTORY_DAYS);

  const totals = snapshot?.totals;
  const holdings = useMemo(
    () =>
      [...(snapshot?.holdings ?? [])].sort(
        (a, b) => (b.weight_pct ?? 0) - (a.weight_pct ?? 0),
      ),
    [snapshot?.holdings],
  );
  const composition = snapshot?.composition ?? [];
  const currency = totals?.currency ?? "KRW";
  const performanceData = (history?.rows ?? []) as PortfolioPoint[];
  const hasHoldings = holdings.length > 0;
  const performanceRangeLabel = useMemo(() => {
    const first = performanceData[0]?.date;
    const last = performanceData.at(-1)?.date;
    if (!first || !last) return "DB 가격 기반";
    return `DB 가격 기반 · ${first} - ${last} · ${performanceData.length.toLocaleString("ko-KR")}개`;
  }, [performanceData]);
  const allocationSourceLabel = `API 포트폴리오 스냅샷 · ${currency} 평가금액 비중`;

  const perfMetrics = [
    {
      label: "총 자산",
      value: fmtMoney(totals?.total_value, currency),
      sub: `원금 ${fmtMoney(totals?.total_cost, currency)}`,
      up: (totals?.total_value ?? 0) >= 0,
    },
    {
      label: "총 수익률",
      value:
        totals == null
          ? "—"
          : `${totals.total_return_pct >= 0 ? "+" : ""}${totals.total_return_pct.toFixed(2)}%`,
      sub: fmtSignedMoney(totals?.total_return, currency),
      up: (totals?.total_return_pct ?? 0) >= 0,
    },
    {
      label: "오늘 손익",
      value: fmtSignedMoney(totals?.today_pnl, currency),
      sub:
        totals == null
          ? "—"
          : `${totals.today_pct >= 0 ? "+" : ""}${totals.today_pct.toFixed(2)}%`,
      up: (totals?.today_pnl ?? 0) >= 0,
    },
    {
      label: "보유 종목",
      value: `${holdings.length}개`,
      sub: composition.length
        ? `상위 ${composition.length}개 비중 표시`
        : "보유 없음",
      up: true,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in-up">
      <AddTransactionDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={() => {
          refetchSnapshot();
          refetchHistory();
        }}
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-['Outfit']">내 포트폴리오</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            보유 종목 · 수익률 · 자산 배분 현황
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => setAddOpen(true)}
          >
            <PlusCircle size={14} />
            종목 추가
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => {
              refetchSnapshot();
              refetchHistory();
              toast.success("최신 가격으로 동기화 중…");
            }}
            disabled={snapshotLoading}
          >
            <RefreshCw
              size={14}
              className={snapshotLoading ? "animate-spin" : undefined}
            />
            동기화
          </Button>
        </div>
      </div>

      {/* Performance metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {perfMetrics.map((m) => (
          <div
            key={m.label}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className="text-xs text-muted-foreground">{m.label}</div>
            <div
              className={cn(
                "text-xl font-bold font-mono-num mt-1",
                m.up ? "text-up" : "text-down",
              )}
            >
              {m.value}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Performance chart */}
        <div className="xl:col-span-3 bg-card border border-border rounded-xl p-5">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-base font-bold font-['Outfit']">
              포트폴리오 가치 추이
            </h2>
            <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
              {performanceLoading && performanceData.length > 0
                ? `갱신 중... · ${performanceRangeLabel}`
                : performanceRangeLabel}
            </span>
          </div>
          {performanceLoading && performanceData.length === 0 ? (
            <div className="h-56 rounded-lg bg-muted/20 animate-pulse" />
          ) : performanceData.length === 0 ? (
            <div className="h-56 flex items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/10 text-center text-sm text-muted-foreground px-6">
              {hasHoldings
                ? "보유 종목의 DB 가격 히스토리가 아직 없습니다"
                : "거래내역을 등록하면 DB 가격 기반 포트폴리오 추이가 표시됩니다"}
            </div>
          ) : (
            <div className="space-y-2">
              <KLineSeriesChart
                data={performanceData}
                settingsScope="portfolio-performance"
                height={250}
                valueFormatter={(v) => fmtMoney(v, currency)}
                sourceLabel="API"
                sourceTone="primary"
                sourceTitle="/portfolios/me/history API · DB 가격 히스토리 기준"
                series={[
                  {
                    key: "portfolio",
                    label: "평가금액",
                    color: "var(--primary)",
                    type: "area",
                  },
                  {
                    key: "cost",
                    label: "원금",
                    color: "var(--muted-foreground)",
                    type: "line",
                    dashed: true,
                  },
                ]}
              />
              {(history?.holdings.length ?? 0) > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                  {history?.holdings.map((item) => (
                    <span
                      key={item.symbol}
                      className="rounded border border-border/60 bg-muted/20 px-1.5 py-0.5"
                      title={`${item.symbol} DB 일봉 ${item.from_date ?? "?"} ~ ${
                        item.to_date ?? "?"
                      }`}
                    >
                      {item.symbol} {item.returned_count.toLocaleString()}행
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Allocation */}
        <div className="xl:col-span-2 bg-card border border-border rounded-xl p-5">
          <h2 className="text-base font-bold font-['Outfit'] mb-4">
            자산 배분
          </h2>
          {composition.length === 0 ? (
            <div className="h-44 flex items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/10 text-sm text-muted-foreground">
              보유 종목이 없습니다
            </div>
          ) : (
            <div
              className="space-y-3"
              role="list"
              aria-label={`자산 배분. ${allocationSourceLabel}`}
            >
              {composition.map((a, i) => {
                const rowLabel = `${a.label} 비중 ${a.percent.toFixed(
                  2,
                )}%, 평가금액 ${fmtMoney(a.amount, currency)}. ${allocationSourceLabel}`;
                return (
                  <div
                    key={a.label}
                    className="space-y-1.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    role="listitem"
                    tabIndex={0}
                    title={rowLabel}
                    aria-label={rowLabel}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground flex-1">
                        {a.label}
                      </span>
                      <span className="text-xs font-mono-num font-medium">
                        {a.percent.toFixed(1)}%
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {fmtMoney(a.amount, currency)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(2, a.percent)}%`,
                          background: COLORS[i % COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-4 text-[11px] text-muted-foreground">
            도넛보다 비중 차이를 빠르게 비교할 수 있도록 막대 기준으로
            표시합니다
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
                {["종목", "현재가", "등락률", "평가금액", "비중", "수익률"].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left py-3 px-4 text-xs text-muted-foreground font-medium"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {holdings.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-10 px-4 text-center text-sm text-muted-foreground"
                  >
                    등록된 보유 종목이 없습니다
                  </td>
                </tr>
              )}
              {holdings.map((h) => (
                <tr
                  key={`${h.symbol}-${h.exchange}`}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <td className="py-3 px-4">
                    <Link href={`/stocks/${h.symbol}`}>
                      <div className="cursor-pointer">
                        <div className="font-semibold text-sm hover:text-primary transition-colors">
                          {h.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono-num">
                          {h.symbol}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="py-3 px-4 font-mono-num text-sm">
                    {fmtMoney(h.last_price, h.currency)}
                  </td>
                  <td className="py-3 px-4">
                    <PctBadge value={h.today_pct} />
                  </td>
                  <td className="py-3 px-4 font-mono-num text-sm">
                    {fmtMoney(h.market_value, h.currency)}
                  </td>
                  <td className="py-3 px-4">
                    <div
                      className="flex items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      tabIndex={0}
                      title={`${h.symbol} 비중 ${
                        h.weight_pct == null
                          ? "데이터 없음"
                          : `${h.weight_pct.toFixed(2)}%`
                      }, 평가금액 ${fmtMoney(h.market_value, h.currency)}. ${allocationSourceLabel}`}
                      aria-label={`${h.symbol} 비중 ${
                        h.weight_pct == null
                          ? "데이터 없음"
                          : `${h.weight_pct.toFixed(2)}%`
                      }, 평가금액 ${fmtMoney(h.market_value, h.currency)}. ${allocationSourceLabel}`}
                    >
                      <div className="w-16 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary/60 rounded-full"
                          style={{
                            width: `${Math.min(100, h.weight_pct ?? 0)}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs font-mono-num">
                        {h.weight_pct == null
                          ? "—"
                          : `${h.weight_pct.toFixed(1)}%`}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={cn(
                        "text-sm font-mono-num font-bold",
                        (h.pnl_pct ?? 0) >= 0 ? "text-up" : "text-down",
                      )}
                    >
                      {h.pnl_pct == null
                        ? "—"
                        : `${h.pnl_pct >= 0 ? "+" : ""}${h.pnl_pct.toFixed(1)}%`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
