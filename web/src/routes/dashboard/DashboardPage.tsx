import { useState } from "react";
import { PageContainer } from "../../components/layout/PageContainer";
import { ActionNotice } from "../../components/interaction/ActionNotice";
import { DetailPanel } from "../../components/interaction/DetailPanel";
import { DataSource } from "../../components/primitives/DataSource";
import { useInteractionActions } from "../../lib/interaction/useInteractionActions";
import { useWatchlist } from "../../lib/useWatchlist";
import { useMacroIndicators } from "../../lib/useMacros";
import { useBreadth, useEconomicEvents, useFearGreed } from "../../lib/useDashboardLive";
import { useTodos } from "../../lib/useTodos";
import { usePortfolioSnapshot } from "../../lib/usePortfolioSnapshot";
import type { PortfolioAsset, PortfolioSummary, TopHolding } from "../../fixtures/dashboard";
import type {
  EconomicEvent,
  EventType,
  FearGreedData,
  MacroIndicator,
} from "../../fixtures/dashboard";
import {
  ECONOMIC_EVENTS,
  FEAR_GREED,
  MACRO_INDICATORS,
  NEWS,
  NOTICE,
  PORTFOLIO_COMPOSITION,
  PORTFOLIO_SUMMARY,
  RETURN_DATA,
  TODOS,
  TOP_HOLDINGS,
  TOP_MOVERS_KR,
  TOP_MOVERS_US,
} from "../../fixtures/dashboard";
import styles from "./DashboardPage.module.css";
import { ActionPrompts } from "./sections/ActionPrompts";
import { EconomicEventsList } from "./sections/EconomicEventsList";
import {
  GreetingActions,
  GreetingMeta,
} from "./sections/GreetingActions";
import { HeatmapCard } from "./sections/HeatmapCard";
import { IndicatorStrip } from "./sections/IndicatorStrip";
import { NewsList } from "./sections/NewsList";
import { NoticeBanner } from "./sections/NoticeBanner";
import { PortfolioSummaryCard } from "./sections/PortfolioSummaryCard";
import { ReturnsChart } from "./sections/ReturnsChart";
import { TopMoversCard } from "./sections/TopMoversCard";
import { WatchlistCard } from "./sections/WatchlistCard";
import {
  eventDetail,
  eventReminderDetail,
  fearGreedDetail,
  heatmapDetail,
  holdingDetail,
  macroDetail,
  newsDetail,
  noticeDetail,
  portfolioAssetDetail,
  portfolioOverviewDetail,
  returnContributorDetail,
  returnSeriesDetail,
  todoDetail,
} from "./dashboardInteractions";
import { useDashboardClock } from "./useDashboardClock";

export function DashboardPage() {
  const watchlistState = useWatchlist();
  const { detail, notice, handleAction, closeDetail } = useInteractionActions();
  const dashboardClock = useDashboardClock();
  const macrosState = useMacroIndicators();
  const fgState = useFearGreed();
  const eventsState = useEconomicEvents(10);
  const krBreadthState = useBreadth("KR");
  const todosApi = useTodos();
  const snapshot = usePortfolioSnapshot();
  const [todos, setTodos] = useState(TODOS);
  // Live todos take precedence when signed in; otherwise local fixture state.
  const liveTodos = todosApi.state.status === "ready"
    ? todosApi.state.items.map((t) => ({
        id: t.id,
        done: t.done,
        task: t.title,
        meta: t.body ?? (t.due_at ? new Date(t.due_at).toLocaleDateString("ko-KR") : ""),
        category: "공통",
        source: "공통" as const,
      }))
    : [];
  const todosForUi = liveTodos.length > 0 ? liveTodos : todos;
  const [starredEventIds, setStarredEventIds] = useState(() => new Set<string>());

  const liveMacros: MacroIndicator[] =
    macrosState.status === "ready"
      ? macrosState.data.indicators
          .filter((m) => m.value !== null)
          .map((m) => {
            const up = (m.change ?? 0) >= 0;
            const decimals = m.unit === "idx" ? 1 : 2;
            return {
              id: m.series_id,
              label: m.label,
              localName: m.series_id,
              market: m.country_code === "KR" ? "KR" : "US",
              value: `${m.value!.toFixed(decimals)}${m.unit && m.unit !== "idx" ? m.unit : ""}`,
              change: m.change != null ? `${Math.abs(m.change).toFixed(decimals)}` : "—",
              up,
              detail: `FRED ${m.series_id} · ${m.date ?? ""}`,
              history: [],
            } satisfies MacroIndicator;
          })
      : [];
  const macrosToShow = liveMacros.length > 0 ? liveMacros : MACRO_INDICATORS;

  const fgFromApi: FearGreedData[] =
    fgState.status === "ready"
      ? fgState.data.items
          .filter((g) => g.value != null)
          .map((g) => ({
            id: `fg-${g.market_code.toLowerCase()}`,
            market: g.market,
            marketCode: g.market_code as "KR" | "US",
            value: Math.round(g.value!),
            label: g.label ?? "—",
            subtext: g.previous_close != null
              ? `직전 ${Math.round(g.previous_close)} → ${Math.round(g.value!)}`
              : "CNN F&G 지수",
            drivers: [],
            history: [
              g.previous_1_month, g.previous_1_week, g.previous_close, g.value,
            ].filter((v): v is number => v != null).map((v) => Math.round(v)),
          }))
      : [];
  const krFromBreadth: FearGreedData | null = krBreadthState.status === "ready" && krBreadthState.data.total > 0
    ? (() => {
        const score = Math.round(krBreadthState.data.score);
        const label = score >= 70 ? "Greed" : score >= 55 ? "Mild Greed" : score >= 45 ? "Neutral" : score >= 30 ? "Fear" : "Extreme Fear";
        return {
          id: "fg-kr",
          market: "한국",
          marketCode: "KR" as const,
          value: score,
          label,
          subtext: `상승 ${krBreadthState.data.rising} · 하락 ${krBreadthState.data.falling}`,
          drivers: [],
          history: [],
        };
      })()
    : null;
  const fearGreedToShow: FearGreedData[] = (() => {
    const merged: FearGreedData[] = [...FEAR_GREED];
    const krIdx = merged.findIndex((g) => g.marketCode === "KR");
    if (krFromBreadth && krIdx >= 0) merged[krIdx] = krFromBreadth;
    const usFromApi = fgFromApi.find((g) => g.marketCode === "US");
    const usIdx = merged.findIndex((g) => g.marketCode === "US");
    if (usFromApi && usIdx >= 0) merged[usIdx] = usFromApi;
    return merged;
  })();

  const liveEvents: EconomicEvent[] =
    eventsState.status === "ready"
      ? eventsState.data.items.map((e, i) => {
          const d = e.time ? new Date(e.time) : null;
          const valid = d && !Number.isNaN(d.getTime());
          return {
            id: `live-${i}`,
            dateLabel: valid ? `${d!.getMonth() + 1}/${d!.getDate().toString().padStart(2, "0")}` : "—",
            dayOfWeek: valid ? ["일","월","화","수","목","금","토"][d!.getDay()] : "",
            event: `${e.country ?? ""} ${e.event ?? ""}`.trim(),
            type: "macro" as EventType,
            importance: (e.impact === "high" ? 3 : 2) as 1 | 2 | 3,
            heldWeight: null,
            memoCount: 0,
            checklistProgress: null,
          };
        })
      : [];
  const eventsToShow = liveEvents.length > 0 ? liveEvents : ECONOMIC_EVENTS;

  const compColors = ["#1f7a55", "#2a6fdb", "#9a6a16", "#7a5cff", "#c83b3b", "#696d70"];
  const fmtMoney = (n: number, ccy: string) => {
    const sign = ccy === "KRW" ? "₩" : "$";
    if (ccy === "KRW") return `${sign}${Math.round(n).toLocaleString("ko-KR")}`;
    return `${sign}${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  const fmtShort = (n: number, ccy: string) => {
    const sign = ccy === "KRW" ? "₩" : "$";
    if (n >= 1e8) return `${sign}${(n / 1e8).toFixed(1)}억`;
    if (n >= 1e4) return `${sign}${(n / 1e4).toFixed(0)}만`;
    return fmtMoney(n, ccy);
  };
  const snapReady = snapshot.status === "ready" && snapshot.data.holdings.length > 0;
  const liveSummary: PortfolioSummary | null = snapReady
    ? {
        totalAssets: fmtMoney(snapshot.data.totals.total_value, snapshot.data.totals.currency),
        totalAssetsShort: fmtShort(snapshot.data.totals.total_value, snapshot.data.totals.currency),
        todayPnl: `${snapshot.data.totals.today_pnl >= 0 ? "+" : ""}${fmtMoney(snapshot.data.totals.today_pnl, snapshot.data.totals.currency)}`,
        todayPnlPercent: `${snapshot.data.totals.today_pct >= 0 ? "+" : ""}${snapshot.data.totals.today_pct.toFixed(2)}%`,
        totalReturn: `${snapshot.data.totals.total_return_pct >= 0 ? "+" : ""}${snapshot.data.totals.total_return_pct.toFixed(2)}%`,
      }
    : null;
  const liveComposition: PortfolioAsset[] = snapReady
    ? snapshot.data.composition.map((c, i) => ({
        label: c.label,
        percent: Math.round(c.percent),
        color: compColors[i % compColors.length],
        amount: fmtShort(c.amount, snapshot.data.totals.currency),
      }))
    : [];
  const liveTopHoldings: TopHolding[] = snapReady
    ? snapshot.data.top_holdings.map((h) => ({
        symbol: h.symbol,
        name: h.name,
        weight: Math.round(h.weight_pct ?? 0),
        change: `${(h.today_pct ?? 0) >= 0 ? "+" : ""}${(h.today_pct ?? 0).toFixed(2)}%`,
        up: (h.today_pct ?? 0) >= 0,
      }))
    : [];
  const summaryToShow = liveSummary ?? PORTFOLIO_SUMMARY;
  const compositionToShow = liveComposition.length > 0 ? liveComposition : PORTFOLIO_COMPOSITION;
  const topHoldingsToShow = liveTopHoldings.length > 0 ? liveTopHoldings : TOP_HOLDINGS;

  return (
    <PageContainer
      title="오늘의 투자 상황판"
      description={
        <GreetingMeta
          currentTimeLabel={dashboardClock.currentTimeLabel}
          marketStatus={dashboardClock.sessions}
        />
      }
      actions={
        liveSummary ? (
          <GreetingActions
            summary={liveSummary}
            onOpenAssets={() => handleAction({ type: "route", to: "/mypage?tab=portfolio" })}
            onOpenTodayPnl={() => handleAction({ type: "detail", detail: returnSeriesDetail(RETURN_DATA, "1D") })}
            onOpenTotalReturn={() => handleAction({ type: "detail", detail: returnSeriesDetail(RETURN_DATA, "ALL") })}
          />
        ) : (
          <DataSource state="empty" source="포트폴리오" detail="로그인 후 보유종목을 추가하세요" />
        )
      }
    >
      <div className={styles.sections}>
        <NoticeBanner
          notice={NOTICE}
          onOpen={() => handleAction({ type: "detail", detail: noticeDetail(NOTICE) })}
        />
        <ActionPrompts
          todos={todosForUi}
          onOpenTodo={(todo) => handleAction({ type: "detail", detail: todoDetail(todo) })}
          onToggleTodo={(todo) => {
            if (todosApi.state.status === "ready") {
              void todosApi.patch(todo.id, { done: !todo.done });
            } else {
              setTodos((current) =>
                current.map((item) =>
                  item.id === todo.id ? { ...item, done: !item.done } : item
                )
              );
            }
          }}
          onAddTodo={
            todosApi.state.status === "ready"
              ? (title) => void todosApi.create({ title })
              : undefined
          }
          onDeleteTodo={
            todosApi.state.status === "ready"
              ? (id) => void todosApi.remove(id)
              : undefined
          }
          onOpenAll={() => handleAction({ type: "route", to: "/mypage?tab=activity" })}
        />

        <div className={styles.pair}>
          <IndicatorStrip
            fearGreed={fearGreedToShow}
            macros={macrosToShow}
            marketTime={dashboardClock.currentTimeLabel}
            onOpenFearGreed={(item) => handleAction({ type: "detail", detail: fearGreedDetail(item) })}
            onOpenMacro={(item) => handleAction({ type: "detail", detail: macroDetail(item) })}
          />
        </div>

        <div className={styles.pair}>
          <WatchlistCard state={watchlistState} />
          <TopMoversCard
            moversByMarket={{ KR: TOP_MOVERS_KR, US: TOP_MOVERS_US }}
            initialMarket={dashboardClock.primaryMarket}
            sessions={dashboardClock.sessions}
          />
        </div>

        <div className={styles.pair}>
          <NewsList
            items={NEWS}
            onOpenNews={(news) => handleAction({ type: "detail", detail: newsDetail(news) })}
            onSaveNews={() => handleAction({ type: "planned", message: "뉴스 저장은 PR-17 저장 항목 데이터화에서 연결됩니다." })}
            onAddNote={() => handleAction({ type: "planned", message: "뉴스 해석/메모 저장은 PR-19 메모 저장에서 연결됩니다." })}
          />
          <EconomicEventsList
            events={eventsToShow}
            starredEventIds={starredEventIds}
            onOpenEvent={(event) => handleAction({ type: "detail", detail: eventDetail(event) })}
            onToggleReminder={(event) => {
              const enabled = !starredEventIds.has(event.id);
              setStarredEventIds((current) => {
                const next = new Set(current);
                if (enabled) {
                  next.add(event.id);
                } else {
                  next.delete(event.id);
                }
                return next;
              });
              handleAction({ type: "detail", detail: eventReminderDetail(event, enabled) });
            }}
          />
        </div>

        <div className={styles.pair}>
          <ReturnsChart
            data={RETURN_DATA}
            onOpenReturns={(period) => handleAction({ type: "detail", detail: returnSeriesDetail(RETURN_DATA, period) })}
            onOpenContributor={(contributor) => handleAction({ type: "detail", detail: returnContributorDetail(contributor) })}
            onSendReview={() => handleAction({ type: "planned", message: "수익률 복기 저장은 PR-19 Thesis/반응 메모 저장에서 연결됩니다." })}
          />
          <PortfolioSummaryCard
            assets={compositionToShow}
            holdings={topHoldingsToShow}
            totalAssetsShort={summaryToShow.totalAssetsShort}
            onOpenPortfolio={() =>
              handleAction({
                type: "detail",
                detail: portfolioOverviewDetail(
                  PORTFOLIO_COMPOSITION,
                  TOP_HOLDINGS,
                  PORTFOLIO_SUMMARY.totalAssetsShort
                ),
              })
            }
            onOpenAsset={(asset) => handleAction({ type: "detail", detail: portfolioAssetDetail(asset) })}
            onOpenHolding={(holding) => handleAction({ type: "detail", detail: holdingDetail(holding) })}
          />
        </div>

        <div className={styles.pairEqual}>
          <HeatmapCard
            title="한국 시장 지도"
            sub="KOSPI 시총 가중"
            seed={1}
            onOpenCell={(title, sub, label, change) =>
              handleAction({ type: "detail", detail: heatmapDetail(title, sub, label, change) })
            }
            onOpenAll={(title, sub) =>
              handleAction({ type: "detail", detail: heatmapDetail(title, sub, "시장 전체", 1.24) })
            }
          />
          <HeatmapCard
            title="미국 시장 지도"
            sub="S&P 500 시총 가중"
            seed={7}
            onOpenCell={(title, sub, label, change) =>
              handleAction({ type: "detail", detail: heatmapDetail(title, sub, label, change) })
            }
            onOpenAll={(title, sub) =>
              handleAction({ type: "detail", detail: heatmapDetail(title, sub, "시장 전체", 0.86) })
            }
          />
        </div>
      </div>
      <DetailPanel detail={detail} onClose={closeDetail} />
      <ActionNotice message={notice} />
    </PageContainer>
  );
}
