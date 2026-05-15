import type { ActionIntent, DetailContent } from "../../lib/interaction/action-intent";
import type {
  EconomicEvent,
  FearGreedData,
  MacroIndicator,
  NewsItem,
  Notice,
  ReturnContributor,
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

export function planned(message: string): ActionIntent {
  return { type: "planned", message };
}
