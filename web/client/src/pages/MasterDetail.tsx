import { useState } from "react";
import { Link, useParams } from "wouter";
import {
  ArrowLeft,
  Award,
  BookOpen,
  BarChart2,
  Briefcase,
  ExternalLink,
  Globe,
  Loader2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  useMasterDetail,
  useMasterHoldings,
  useMasterQuarters,
} from "@/features/masters";

const TABS = [
  { id: "overview", label: "개요", icon: Award },
  { id: "holdings", label: "13F 포트폴리오", icon: BarChart2 },
  { id: "quarters", label: "분기 변화", icon: BarChart2 },
  { id: "philosophy", label: "투자철학", icon: BookOpen },
  { id: "books", label: "저서", icon: Briefcase },
] as const;

type TabId = (typeof TABS)[number]["id"];

function formatAum(aum: number | null, currency: string | null): string {
  if (aum == null) return "—";
  const cur = currency ?? "USD";
  if (aum >= 1e12) return `${cur} ${(aum / 1e12).toFixed(2)}T`;
  if (aum >= 1e9) return `${cur} ${(aum / 1e9).toFixed(1)}B`;
  if (aum >= 1e6) return `${cur} ${(aum / 1e6).toFixed(1)}M`;
  return `${cur} ${aum.toLocaleString()}`;
}

export default function MasterDetail() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<TabId>("overview");

  const { data: master, loading, error } = useMasterDetail(id);
  const { data: holdings } = useMasterHoldings(
    tab === "holdings" ? id : undefined,
  );
  const { data: quarters } = useMasterQuarters(
    tab === "quarters" ? id : undefined,
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        거장 정보를 불러오는 중…
      </div>
    );
  }

  if (error || !master) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-destructive">
          {error?.message ?? "거장을 찾을 수 없습니다."}
        </p>
        <Link href="/masters">
          <button className="text-xs text-emerald-400 hover:underline">
            ← 거장 목록으로
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/masters">
            <button
              aria-label="뒤로"
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold tracking-tight">{master.name}</h1>
            {master.firm && (
              <p className="text-xs text-muted-foreground">{master.firm}</p>
            )}
          </div>
          {master.homepage_url && (
            <a
              href={master.homepage_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Globe className="w-3.5 h-3.5" />
              홈페이지
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                  active
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {tab === "overview" && (
          <>
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="국가" value={master.country_code ?? "—"} mono />
              <Stat label="스타일" value={master.style ?? "—"} />
              <Stat
                label="AUM"
                value={formatAum(master.aum, master.aum_currency)}
                mono
              />
              <Stat label="13F CIK" value={master.filer_cik ?? "—"} mono />
            </section>

            {master.description && (
              <section className="rounded-lg border border-border/60 bg-card/60 p-5">
                <h2 className="text-xs font-semibold text-muted-foreground mb-2">
                  소개
                </h2>
                <p className="text-sm leading-relaxed">{master.description}</p>
              </section>
            )}

            {master.strategies.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold mb-3">전략</h2>
                <ul className="space-y-3">
                  {master.strategies.map((s) => (
                    <li
                      key={s.ordinal}
                      className="rounded-lg border border-border/60 bg-card/40 p-4"
                    >
                      <h3 className="text-sm font-medium">{s.title}</h3>
                      {s.body && (
                        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                          {s.body}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        {tab === "philosophy" && (
          <section>
            {master.principles.length === 0 ? (
              <Empty text="등록된 투자 원칙이 없습니다." />
            ) : (
              <ol className="space-y-3">
                {master.principles.map((p) => (
                  <li
                    key={p.ordinal}
                    className="rounded-lg border border-border/60 bg-card/40 p-4 flex gap-4"
                  >
                    <div className="text-xs font-mono text-emerald-400 mt-0.5">
                      {String(p.ordinal).padStart(2, "0")}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium">{p.title}</h3>
                      {p.body && (
                        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                          {p.body}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}

        {tab === "holdings" && (
          <section>
            {!holdings ? (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-12">
                <Loader2 className="w-4 h-4 animate-spin" />
                보유 종목을 불러오는 중…
              </div>
            ) : holdings.holdings.length === 0 ? (
              <Empty
                text={
                  "이 거장의 13F 보유 종목이 아직 수집되지 않았습니다."
                }
              />
            ) : (
              <>
                <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground">
                  <span>
                    공시 기준: {holdings.period_end ?? "—"} ·{" "}
                    {holdings.filed_at ?? "—"} 제출
                  </span>
                  <span className="font-mono">
                    {holdings.holdings.length} positions
                  </span>
                </div>
                <div className="overflow-x-auto rounded-lg border border-border/60">
                  <table className="w-full text-xs">
                    <thead className="bg-card/40 text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">종목</th>
                        <th className="px-3 py-2 text-right font-medium">
                          수량
                        </th>
                        <th className="px-3 py-2 text-right font-medium">
                          평가액
                        </th>
                        <th className="px-3 py-2 text-right font-medium">
                          비중
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {holdings.holdings.map((h) => {
                        const symbolCell = h.symbol ? (
                          <Link href={`/stocks/${h.symbol}`}>
                            <span className="font-mono text-emerald-400 hover:underline cursor-pointer">
                              {h.symbol}
                            </span>
                          </Link>
                        ) : (
                          <span className="font-mono text-muted-foreground">—</span>
                        );
                        return (
                          <tr
                            key={h.instrument_id}
                            className="border-t border-border/40 hover:bg-card/40"
                          >
                            <td className="px-3 py-2">
                              <div>{symbolCell}</div>
                              {h.name && (
                                <div className="text-[10px] text-muted-foreground">
                                  {h.name}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right font-mono">
                              {h.shares.toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-right font-mono">
                              {h.market_value
                                ? `$${(h.market_value / 1e6).toFixed(1)}M`
                                : "—"}
                            </td>
                            <td className="px-3 py-2 text-right font-mono">
                              {h.weight_pct != null
                                ? `${h.weight_pct.toFixed(2)}%`
                                : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        )}

        {tab === "quarters" && (
          <section>
            {!quarters ? (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-12">
                <Loader2 className="w-4 h-4 animate-spin" />
                분기 변화를 불러오는 중…
              </div>
            ) : quarters.rows.length === 0 ? (
              <Empty text="분기별 데이터가 아직 없습니다." />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border/60">
                <table className="w-full text-xs">
                  <thead className="bg-card/40 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium sticky left-0 bg-card/40">
                        종목
                      </th>
                      {quarters.quarters.map((q) => (
                        <th
                          key={q}
                          className="px-3 py-2 text-right font-mono font-medium whitespace-nowrap"
                        >
                          {q.slice(2, 7)}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-right font-medium">
                        변동
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {quarters.rows.slice(0, 30).map((r) => {
                      const kindColor: Record<string, string> = {
                        up: "text-up",
                        down: "text-down",
                        new: "text-sky-400",
                        exit: "text-muted-foreground/60",
                        flat: "text-muted-foreground",
                      };
                      const kindLabel: Record<string, string> = {
                        up: "확대",
                        down: "축소",
                        new: "신규",
                        exit: "정리",
                        flat: "유지",
                      };
                      return (
                        <tr
                          key={r.instrument_id}
                          className="border-t border-border/40 hover:bg-card/40 tabular-nums font-mono"
                        >
                          <td className="px-3 py-2 sticky left-0 bg-background">
                            {r.symbol ? (
                              <Link href={`/stocks/${r.symbol}`}>
                                <span className="text-emerald-400 hover:underline cursor-pointer">
                                  {r.symbol}
                                </span>
                              </Link>
                            ) : (
                              "—"
                            )}
                            {r.name && (
                              <div className="text-[10px] text-muted-foreground font-sans">
                                {r.name}
                              </div>
                            )}
                          </td>
                          {r.weights.map((w, idx) => (
                            <td
                              key={`${r.instrument_id}-${idx}`}
                              className="px-3 py-2 text-right"
                            >
                              {w != null ? `${w.toFixed(2)}%` : "—"}
                            </td>
                          ))}
                          <td className={`px-3 py-2 text-right ${kindColor[r.change_kind] ?? ""}`}>
                            {kindLabel[r.change_kind] ?? r.change_kind}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {tab === "books" && (
          <section>
            {master.books.length === 0 ? (
              <Empty text="등록된 저서가 없습니다." />
            ) : (
              <ul className="space-y-2">
                {master.books.map((b) => (
                  <li
                    key={b.id}
                    className="rounded-lg border border-border/60 bg-card/40 p-4 flex items-start justify-between gap-3"
                  >
                    <div>
                      <h3 className="text-sm font-medium">{b.title}</h3>
                      {b.year && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {b.year}
                        </p>
                      )}
                    </div>
                    {b.url && (
                      <a
                        href={b.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-emerald-400 hover:underline whitespace-nowrap"
                      >
                        링크 ↗
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 text-sm ${mono ? "font-mono" : ""}`}>
        <Badge variant="outline" className="border-transparent px-0 text-sm">
          {value}
        </Badge>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-card/30 p-10 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
