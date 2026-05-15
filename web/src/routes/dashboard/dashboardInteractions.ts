import type { ActionIntent, DetailContent } from "../../lib/interaction/action-intent";
import type { EconomicEvent, NewsItem, Notice, ReturnContributor, TodoItem } from "../../fixtures/dashboard";

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
        body: "세부 검토는 마이페이지 활동 탭에서 이어가고, 메모 저장은 메모/Thesis 저장 PR에서 영구화됩니다.",
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
