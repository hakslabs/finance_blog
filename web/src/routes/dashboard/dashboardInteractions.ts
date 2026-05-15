import type { ActionIntent, DetailContent } from "../../lib/interaction/action-intent";
import type {
  EconomicEvent,
  FearGreedData,
  MacroIndicator,
  NewsItem,
  Notice,
  PortfolioAsset,
  ReturnContributor,
  ReturnSeries,
  TopHolding,
  TodoItem,
} from "../../fixtures/dashboard";

export function noticeDetail(notice: Notice): DetailContent {
  return {
    id: `notice-${notice.date}`,
    eyebrow: notice.tag,
    title: notice.title,
    meta: notice.date,
    summary: notice.description,
    sections: [
      {
        title: "왜 중요한가",
        body: "마이페이지와 Thesis 흐름은 개인 투자 판단의 기록과 복기를 한곳으로 모으는 핵심 사용자 허브입니다.",
      },
      {
        title: "다음 연결",
        body: "프로필 저장, 메모 저장, 알림 반응 기록은 후속 저장 PR에서 실제 데이터로 연결됩니다.",
      },
    ],
  };
}

export function todoDetail(todo: TodoItem): DetailContent {
  return {
    id: todo.id,
    eyebrow: `오늘 할 일 · ${todo.source}`,
    title: todo.task,
    meta: todo.meta,
    tags: [todo.category, todo.done ? "완료" : "진행 필요"],
    summary: "이 항목은 시장 이벤트, 보유 포지션, 알림 조건을 기준으로 생성된 작업입니다.",
    sections: [
      {
        title: "처리 방식",
        body: todo.done
          ? "완료 처리된 항목입니다. 체크 표시를 다시 누르면 미완료로 되돌릴 수 있습니다."
          : "행 왼쪽 체크 표시로 완료 상태를 바로 바꿀 수 있고, 세부 검토는 마이페이지 활동 탭에서 이어갑니다.",
      },
    ],
  };
}

export function fearGreedDetail(data: FearGreedData): DetailContent {
  return {
    id: data.id,
    eyebrow: `시장 심리 · ${data.market}`,
    title: `${data.market} 공포 · 탐욕 지수`,
    meta: `${data.value} · ${data.label}`,
    tags: [data.marketCode, data.label],
    summary: data.subtext,
    sections: [
      {
        title: "최근 흐름",
        body: "최근 5개 관측치를 0–100 스케일로 비교합니다.",
        chart: data.history.map((value, index) => ({
          label: `D-${data.history.length - index - 1}`,
          value,
          tone: value >= 65 ? "positive" : value <= 35 ? "negative" : "accent",
        })),
      },
      {
        title: "주요 원인",
        body: "현재 점수에 영향을 준 대표 요인입니다.",
        items: data.drivers,
      },
    ],
  };
}

export function macroDetail(macro: MacroIndicator): DetailContent {
  return {
    id: macro.id,
    eyebrow: `핵심 경제지표 · ${macro.market}`,
    title: macro.label,
    meta: `${macro.value} · ${macro.change}`,
    tags: [macro.localName, macro.up ? "상승" : "하락"],
    summary: macro.detail,
    sections: [
      {
        title: "최근 흐름",
        body: "화면용 샘플 흐름입니다. 실제 시계열은 경제지표 API 연결 PR에서 교체됩니다.",
        chart: macro.history.map((value, index) => ({
          label: `T-${macro.history.length - index - 1}`,
          value,
          tone: macro.up ? "positive" : "negative",
        })),
      },
      {
        title: "확인 포인트",
        body: "해당 지표가 보유 종목, 환율, 섹터 흐름에 어떤 영향을 주는지 함께 확인합니다.",
      },
    ],
  };
}

export function newsDetail(news: NewsItem): DetailContent {
  return {
    id: news.id,
    eyebrow: `${news.source} · ${news.category.toUpperCase()}`,
    title: news.title,
    meta: `${news.timeAgo} 전 · 내 포지션 영향 ${news.portfolioImpact}`,
    tags: news.relatedSymbols,
    summary: "뉴스 원문/요약/내 해석을 한 패널에서 확인하도록 연결하는 상세 보기입니다.",
    sections: [
      {
        title: "관련 종목",
        body: news.relatedSymbols.join(", "),
      },
      {
        title: "내 해석",
        body: news.hasMyNote
          ? "이미 작성한 해석이 있습니다. 편집 기능은 메모 저장 PR에서 연결됩니다."
          : "해석 추가는 메모 저장 PR에서 실제 저장 경로로 연결됩니다.",
      },
    ],
  };
}

export function eventDetail(event: EconomicEvent): DetailContent {
  return {
    id: event.id,
    eyebrow: `캘린더 · ${event.type}`,
    title: event.event,
    meta: `${event.dateLabel} ${event.dayOfWeek}`,
    tags: [`중요도 ${event.importance}`, event.heldWeight ? `보유 ${event.heldWeight}` : "시장 이벤트"],
    summary: "이벤트별 영향 종목, 체크리스트, 메모를 한곳에서 확인하기 위한 상세 패널입니다.",
    sections: [
      {
        title: "체크 상태",
        body: event.checklistProgress ?? "아직 연결된 체크리스트가 없습니다.",
      },
      {
        title: "메모",
        body: event.memoCount > 0 ? `연결된 메모 ${event.memoCount}개` : "아직 작성한 메모가 없습니다.",
      },
    ],
  };
}

export function eventReminderDetail(event: EconomicEvent, enabled: boolean): DetailContent {
  return {
    id: `reminder-${event.id}`,
    eyebrow: "캘린더 알림",
    title: event.event,
    meta: enabled ? "관심 일정 등록됨" : "관심 일정 해제됨",
    tags: [enabled ? "알림 후보" : "알림 해제", `중요도 ${event.importance}`],
    summary: enabled
      ? "이 일정은 관심 일정으로 표시되었습니다. 실제 푸시/메일 알림은 알림 백엔드가 연결될 때 영구 저장됩니다."
      : "관심 표시를 해제했습니다. 현재는 화면 내 상태로만 반영됩니다.",
    sections: [
      {
        title: "알림 기준",
        body: "보유 비중, 중요도, 메모 여부를 기준으로 알림 우선순위를 계산할 수 있게 준비합니다.",
        items: [
          event.heldWeight ? `보유 비중 ${event.heldWeight}` : "보유 종목 직접 연결 없음",
          event.memoCount > 0 ? `연결 메모 ${event.memoCount}개` : "연결 메모 없음",
          event.checklistProgress ? `체크리스트 ${event.checklistProgress}` : "체크리스트 미생성",
        ],
      },
    ],
  };
}

export function returnContributorDetail(contributor: ReturnContributor): DetailContent {
  return {
    id: `return-${contributor.symbol}`,
    eyebrow: "수익률 기여 요인",
    title: `${contributor.symbol} · ${contributor.name}`,
    meta: contributor.contribution,
    summary: contributor.reason,
    sections: [
      {
        title: "복기 연결",
        body: "이 기여 요인은 마이페이지 Thesis/반응 메모로 보낼 수 있는 후보입니다. 실제 저장은 메모 PR에서 연결됩니다.",
      },
    ],
  };
}

export function returnSeriesDetail(data: ReturnSeries, period: string): DetailContent {
  return {
    id: `returns-${period}`,
    eyebrow: "내 수익률 상세",
    title: `${period} 수익률 비교`,
    meta: `내 포트폴리오 ${data.portfolioReturn} · KOSPI ${data.kospiReturn} · S&P 500 ${data.sp500Return}`,
    tags: ["성과 비교", "벤치마크", period],
    summary: data.learningPoint,
    sections: [
      {
        title: "벤치마크 비교",
        body: "현재 기간에서 내 포트폴리오와 주요 시장 지수를 비교합니다.",
        chart: [
          { label: "Portfolio", value: 68, tone: "accent" },
          { label: "KOSPI", value: 44, tone: "neutral" },
          { label: "S&P 500", value: 51, tone: "neutral" },
        ],
      },
      {
        title: "기여 요인",
        body: "성과를 만든 대표 보유 종목과 원인입니다.",
        items: data.contributors.map(
          (item) => `${item.symbol} ${item.contribution} · ${item.reason}`
        ),
      },
    ],
  };
}

export function portfolioAssetDetail(asset: PortfolioAsset): DetailContent {
  return {
    id: `asset-${asset.label}`,
    eyebrow: "포트폴리오 구성",
    title: asset.label,
    meta: `${asset.percent}% · ₩${asset.amount}`,
    tags: ["자산 배분", "비중 점검"],
    summary: "전체 자산에서 이 분류가 차지하는 비중과 리밸런싱 점검 포인트입니다.",
    sections: [
      {
        title: "비중",
        body: "현재 포트폴리오 내 비중입니다.",
        chart: [{ label: asset.label, value: asset.percent, tone: "accent" }],
      },
      {
        title: "확인 포인트",
        body: "목표 비중, 환율 영향, 섹터 쏠림 여부는 포트폴리오 고도화 PR에서 저장값과 연결됩니다.",
      },
    ],
  };
}

export function portfolioOverviewDetail(
  assets: PortfolioAsset[],
  holdings: TopHolding[],
  totalAssetsShort: string
): DetailContent {
  return {
    id: "portfolio-overview",
    eyebrow: "포트폴리오 구성",
    title: "전체 구성 상세",
    meta: `총 자산 ${totalAssetsShort} · 상위 보유 ${holdings.length}개`,
    tags: ["자산 배분", "보유 비중", "리스크 점검"],
    summary: "국가/자산 분류와 상위 보유 종목을 함께 보고 쏠림을 점검합니다.",
    sections: [
      {
        title: "자산 분류",
        body: "현재 분류별 비중입니다.",
        chart: assets.map((asset) => ({
          label: asset.label,
          value: asset.percent,
          tone: "accent",
        })),
      },
      {
        title: "상위 보유",
        body: "포트폴리오 수익률에 가장 큰 영향을 주는 보유 종목입니다.",
        items: holdings.map((holding) => `${holding.symbol} ${holding.weight}% · ${holding.change}`),
      },
    ],
  };
}

export function holdingDetail(holding: TopHolding): DetailContent {
  return {
    id: `holding-${holding.symbol}`,
    eyebrow: "상위 보유 상세",
    title: `${holding.symbol} · ${holding.name}`,
    meta: `비중 ${holding.weight}% · 오늘 ${holding.change}`,
    tags: [holding.up ? "상승" : "하락", "보유 종목"],
    summary: "이 보유 종목이 포트폴리오 전체에 주는 영향과 다음 점검 액션입니다.",
    sections: [
      {
        title: "비중 영향",
        body: "비중이 높을수록 수익률과 리스크에 미치는 영향이 커집니다.",
        chart: [{ label: holding.symbol, value: holding.weight, tone: holding.up ? "positive" : "negative" }],
      },
      {
        title: "다음 액션",
        body: "종목 상세, thesis, 거래내역을 연결해 매수 이유와 청산 조건을 확인하는 흐름으로 확장합니다.",
      },
    ],
  };
}

export function heatmapDetail(title: string, sub: string, label: string, change: number): DetailContent {
  return {
    id: `heatmap-${title}-${label}`,
    eyebrow: title,
    title: label,
    meta: `${change >= 0 ? "+" : ""}${change.toFixed(2)}% · ${sub}`,
    tags: [change >= 0 ? "상승" : "하락", "시장지도"],
    summary: "시장지도 셀을 확대한 상세 보기입니다. 섹터와 종목별 강도 비교를 빠르게 확인합니다.",
    sections: [
      {
        title: "등락 강도",
        body: "절대 등락률을 기준으로 셀 색상 강도를 계산합니다.",
        chart: [{ label, value: Math.min(100, Math.round(Math.abs(change) * 22)), tone: change >= 0 ? "positive" : "negative" }],
      },
      {
        title: "확인 포인트",
        body: "실제 시장지도 API가 연결되면 구성 종목, 거래대금, 섹터 평균을 같은 패널에서 보여줍니다.",
      },
    ],
  };
}

export function planned(message: string): ActionIntent {
  return { type: "planned", message };
}
