import { useState } from "react";
import { PageContainer } from "../../components/layout/PageContainer";
import { ActionNotice } from "../../components/interaction/ActionNotice";
import { DetailPanel } from "../../components/interaction/DetailPanel";
import { useInteractionActions } from "../../lib/interaction/useInteractionActions";
import { useWatchlist } from "../../lib/useWatchlist";
import { useMacroIndicators } from "../../lib/useMacros";
import { useEconomicEvents, useFearGreed } from "../../lib/useDashboardLive";
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
  const [todos, setTodos] = useState(TODOS);
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
  const fearGreedToShow: FearGreedData[] = (() => {
    if (fgFromApi.length === 0) return FEAR_GREED;
    const usFromApi = fgFromApi.find((g) => g.marketCode === "US");
    const merged: FearGreedData[] = [...FEAR_GREED];
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
        <GreetingActions
          summary={PORTFOLIO_SUMMARY}
          onOpenAssets={() => handleAction({ type: "route", to: "/mypage?tab=portfolio" })}
          onOpenTodayPnl={() => handleAction({ type: "detail", detail: returnSeriesDetail(RETURN_DATA, "1D") })}
          onOpenTotalReturn={() => handleAction({ type: "detail", detail: returnSeriesDetail(RETURN_DATA, "ALL") })}
        />
      }
    >
      <div className={styles.sections}>
        <NoticeBanner
          notice={NOTICE}
          onOpen={() => handleAction({ type: "detail", detail: noticeDetail(NOTICE) })}
        />
        <ActionPrompts
          todos={todos}
          onOpenTodo={(todo) => handleAction({ type: "detail", detail: todoDetail(todo) })}
          onToggleTodo={(todo) =>
            setTodos((current) =>
              current.map((item) =>
                item.id === todo.id ? { ...item, done: !item.done } : item
              )
            )
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
            assets={PORTFOLIO_COMPOSITION}
            holdings={TOP_HOLDINGS}
            totalAssetsShort={PORTFOLIO_SUMMARY.totalAssetsShort}
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

        <div className={styles.pair}>
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
