import { PageContainer } from "../../components/layout/PageContainer";
import { ActionNotice } from "../../components/interaction/ActionNotice";
import { DetailPanel } from "../../components/interaction/DetailPanel";
import { useInteractionActions } from "../../lib/interaction/useInteractionActions";
import { useAuth } from "../../lib/auth-state";
import { getUserDisplayName } from "../../lib/auth-user";
import { useWatchlist } from "../../lib/useWatchlist";
import {
  ECONOMIC_EVENTS,
  FEAR_GREED,
  GREETING_NAME,
  MACRO_INDICATORS,
  MARKET_STATUS,
  NEWS,
  NOTICE,
  PORTFOLIO_COMPOSITION,
  PORTFOLIO_SUMMARY,
  RETURN_DATA,
  TODOS,
  TOP_HOLDINGS,
  TOP_MOVERS,
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
import { eventDetail, newsDetail, noticeDetail, returnContributorDetail, todoDetail } from "./dashboardInteractions";

export function DashboardPage() {
  const auth = useAuth();
  const watchlistState = useWatchlist();
  const { detail, notice, handleAction, closeDetail } = useInteractionActions();
  const greetingName =
    auth.status === "signed-in" ? getUserDisplayName(auth.user) : GREETING_NAME;

  return (
    <PageContainer
      title={`좋은 아침입니다, ${greetingName} 님`}
      description={
        <GreetingMeta
          date={MARKET_STATUS.date}
          day={MARKET_STATUS.day}
          time={MARKET_STATUS.time}
          nyseOpensIn={MARKET_STATUS.nyseOpensIn}
        />
      }
      actions={<GreetingActions summary={PORTFOLIO_SUMMARY} />}
    >
      <div className={styles.sections}>
        <NoticeBanner
          notice={NOTICE}
          onOpen={() => handleAction({ type: "detail", detail: noticeDetail(NOTICE) })}
        />
        <ActionPrompts
          todos={TODOS}
          onOpenTodo={(todo) => handleAction({ type: "detail", detail: todoDetail(todo) })}
          onOpenAll={() => handleAction({ type: "route", to: "/mypage?tab=activity" })}
        />

        <div className={styles.pair}>
          <IndicatorStrip
            fearGreed={FEAR_GREED}
            macros={MACRO_INDICATORS}
            marketTime={MARKET_STATUS.time}
          />
        </div>

        <div className={styles.pair}>
          <WatchlistCard state={watchlistState} />
          <TopMoversCard movers={TOP_MOVERS} />
        </div>

        <div className={styles.pair}>
          <NewsList
            items={NEWS}
            onOpenNews={(news) => handleAction({ type: "detail", detail: newsDetail(news) })}
            onSaveNews={() => handleAction({ type: "planned", message: "뉴스 저장은 PR-17 저장 항목 데이터화에서 연결됩니다." })}
            onAddNote={() => handleAction({ type: "planned", message: "뉴스 해석/메모 저장은 PR-19 메모 저장에서 연결됩니다." })}
          />
          <EconomicEventsList
            events={ECONOMIC_EVENTS}
            onOpenEvent={(event) => handleAction({ type: "detail", detail: eventDetail(event) })}
          />
        </div>

        <div className={styles.pair}>
          <ReturnsChart
            data={RETURN_DATA}
            onOpenContributor={(contributor) => handleAction({ type: "detail", detail: returnContributorDetail(contributor) })}
            onSendReview={() => handleAction({ type: "planned", message: "수익률 복기 저장은 PR-19 Thesis/반응 메모 저장에서 연결됩니다." })}
          />
          <PortfolioSummaryCard
            assets={PORTFOLIO_COMPOSITION}
            holdings={TOP_HOLDINGS}
            totalAssetsShort={PORTFOLIO_SUMMARY.totalAssetsShort}
          />
        </div>

        <div className={styles.pair}>
          <HeatmapCard title="한국 시장 지도" sub="KOSPI 시총 가중" seed={1} />
          <HeatmapCard title="미국 시장 지도" sub="S&P 500 시총 가중" seed={7} />
        </div>
      </div>
      <DetailPanel detail={detail} onClose={closeDetail} />
      <ActionNotice message={notice} />
    </PageContainer>
  );
}
