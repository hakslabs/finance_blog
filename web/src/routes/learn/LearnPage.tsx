import { useState } from "react";
import { PageContainer } from "../../components/layout/PageContainer";
import { ActionNotice } from "../../components/interaction/ActionNotice";
import { DetailPanel } from "../../components/interaction/DetailPanel";
import { Badge } from "../../components/primitives/Badge";
import { Card } from "../../components/primitives/Card";
import { DataTable } from "../../components/primitives/DataTable";
import { EmptyState } from "../../components/primitives/EmptyState";
import { useInteractionActions } from "../../lib/interaction/useInteractionActions";
import { GUIDE_ARTICLES, GLOSSARY_TERMS, LEARN_CATEGORIES, LEARN_TABS } from "../../fixtures/learn";
import type { GlossaryTerm, GuideArticle, LearnCategory, LearnTab } from "../../fixtures/learn";
import { REPORTS } from "../../fixtures/reports";
import type { ReportListItem } from "../../fixtures/reports";
import styles from "./LearnPage.module.css";

const reportColumns = (onOpenReport: (row: ReportListItem) => void) => [
  {
    key: "title",
    header: "리포트",
    render: (row: ReportListItem) => (
      <button
        type="button"
        className={styles.textButton}
        onClick={(event) => {
          event.stopPropagation();
          onOpenReport(row);
        }}
      >
        {row.title}
      </button>
    ),
  },
  { key: "source", header: "출처", render: (row: ReportListItem) => row.source },
  { key: "category", header: "분류", render: (row: ReportListItem) => <Badge tone="neutral">{row.category}</Badge> },
  { key: "date", header: "발간일", align: "right" as const, render: (row: ReportListItem) => row.date },
];

function guideDetail(article: GuideArticle) {
  return {
    id: article.id,
    eyebrow: `Learn · ${article.category}`,
    title: article.title,
    meta: article.minutes,
    summary: article.summary,
    tags: [article.category],
    sections: [
      {
        title: "학습 목표",
        body: "이 글을 읽고 나면 설명할 수 있어야 하는 내용입니다.",
        items: article.objectives,
      },
      {
        title: "핵심 개념",
        body: "본문에서 반복해서 등장하는 기본 용어입니다.",
        items: article.keyConcepts,
      },
      {
        title: "실전 예시",
        body: article.example,
      },
      {
        title: "체크리스트",
        body: "실제 종목을 볼 때 바로 확인할 항목입니다.",
        items: article.checklist,
      },
      {
        title: "후속 연결",
        body: "학습 진행률, 북마크, 관련 리포트 추천은 같은 상세 패널에서 이어지도록 확장합니다.",
      },
    ],
  };
}

function glossaryDetail(term: GlossaryTerm) {
  return {
    id: term.id,
    eyebrow: `Glossary · ${term.category}`,
    title: `${term.term} · ${term.korean}`,
    summary: term.description,
    tags: [term.category],
    sections: [
      ...(term.formula
        ? [
            {
              title: "계산식",
              body: term.formula,
            },
          ]
        : []),
      {
        title: "예시",
        body: term.example,
      },
      {
        title: "주의할 점",
        body: "지표를 단독으로 해석할 때 생기는 대표적인 오해입니다.",
        items: term.pitfalls,
      },
      {
        title: "같이 볼 용어",
        body: "이 용어와 함께 보면 해석이 선명해지는 개념입니다.",
        items: term.relatedTerms,
      },
    ],
  };
}

function reportDetail(row: ReportListItem) {
  return {
    id: row.id,
    eyebrow: `${row.source} · ${row.category}`,
    title: row.title,
    meta: `${row.date} · ${row.pages}p`,
    summary: row.summary,
    tags: row.tags,
    sections: [
      {
        title: "핵심 질문",
        body: "리포트를 학습 자료로 읽을 때 먼저 답해야 하는 질문입니다.",
        items: [
          "이 리포트가 말하는 투자 아이디어는 무엇인가",
          "실적·밸류에이션·수급 중 어떤 근거가 가장 중요한가",
          "내 관심종목 또는 포트폴리오와 직접 연결되는가",
        ],
      },
      {
        title: "읽는 순서",
        body: "짧은 시간에 핵심만 훑을 때의 권장 순서입니다.",
        items: ["요약과 투자의견", "실적 추정 변화", "핵심 차트", "리스크 요인"],
      },
      {
        title: "체크리스트",
        body: "리포트 태그를 기준으로 다시 확인할 항목입니다.",
        items: row.tags.map((tag) => `${tag} 관점에서 다시 확인`),
      },
    ],
  };
}

function categoryDetail(category: LearnCategory, articles: GuideArticle[]) {
  const relatedArticles = articles.filter((article) =>
    category.path.some(
      (keyword) =>
        article.title.includes(keyword) ||
        article.summary.includes(keyword) ||
        article.keyConcepts.some((concept) => concept.includes(keyword)),
    ),
  );

  return {
    id: category.id,
    eyebrow: "Learn category",
    title: category.title,
    meta: `${category.count}편`,
    summary: category.focus,
    tags: category.path,
    sections: [
      {
        title: "학습 경로",
        body: "이 카테고리에서 순서대로 익힐 키워드입니다.",
        items: category.path,
      },
      {
        title: "추천 시작점",
        body: "현재 fixture 기준으로 바로 열어볼 만한 학습 글입니다.",
        items: (relatedArticles.length > 0 ? relatedArticles : articles.slice(0, 3)).map(
          (article) => article.title,
        ),
      },
      {
        title: "완료 기준",
        body: "용어를 외우는 것보다 실제 종목 화면에서 같은 지표를 눌러 설명할 수 있으면 완료로 봅니다.",
      },
    ],
  };
}

function Guides({
  articles,
  onOpenArticle,
  onOpenCategory,
}: {
  articles: GuideArticle[];
  onOpenArticle: (article: GuideArticle) => void;
  onOpenCategory: (category: LearnCategory) => void;
}) {
  return (
    <div className={styles.guideGrid}>
      <Card title="카테고리">
        <div className={styles.categoryList}>
          {LEARN_CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              className={styles.categoryRow}
              onClick={() => onOpenCategory(category)}
            >
              <span>{category.title}</span>
              <span>{category.count}편</span>
              <small>{category.focus}</small>
            </button>
          ))}
        </div>
      </Card>
      <Card title="이번 주 추천">
        <div className={styles.articleList}>
          {articles.map((article) => (
            <button
              key={article.id}
              type="button"
              className={styles.article}
              onClick={() => onOpenArticle(article)}
            >
              <div className={styles.thumb} aria-hidden="true">Guide</div>
              <div>
                <p>{article.title}</p>
                <span>{article.summary}</span>
                <div className={styles.articleMeta}>
                  <Badge tone="accent">{article.category}</Badge>
                  <span>{article.minutes}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function LearnPage() {
  const [activeTab, setActiveTab] = useState<LearnTab>("입문서·칼럼");
  const { detail, notice, handleAction, closeDetail } = useInteractionActions();

  const glossaryColumns = [
    {
      key: "term",
      header: "용어",
      render: (row: GlossaryTerm) => (
        <button
          type="button"
          className={styles.termButton}
          onClick={(event) => {
            event.stopPropagation();
            handleAction({ type: "detail", detail: glossaryDetail(row) });
          }}
        >
          <span className={styles.term}>{row.term}<span>{row.korean}</span></span>
        </button>
      ),
    },
    { key: "category", header: "분류", render: (row: GlossaryTerm) => <Badge tone="neutral">{row.category}</Badge> },
    { key: "description", header: "설명", render: (row: GlossaryTerm) => row.description },
  ];

  return (
    <PageContainer
      eyebrow="Learn"
      title="학습"
      description="입문서, 칼럼, 용어 사전, 리포트 라이브러리를 투자 흐름 가까이에 둡니다."
    >
      <nav className={styles.tabBar} aria-label="학습 탭">
        {LEARN_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ""}`}
            onClick={() => setActiveTab(tab)}
            aria-pressed={activeTab === tab}
          >
            {tab}
          </button>
        ))}
      </nav>

      {activeTab === "입문서·칼럼" ? (
        <Guides
          articles={GUIDE_ARTICLES}
          onOpenArticle={(article) => handleAction({ type: "detail", detail: guideDetail(article) })}
          onOpenCategory={(category) => handleAction({ type: "detail", detail: categoryDetail(category, GUIDE_ARTICLES) })}
        />
      ) : null}
      {activeTab === "용어 사전" ? (
        <Card title="용어 사전" eyebrow={`${GLOSSARY_TERMS.length}개 선별`}>
          <DataTable<GlossaryTerm>
            columns={glossaryColumns}
            rows={GLOSSARY_TERMS}
            getRowKey={(row) => row.id}
            density="compact"
            onRowClick={(row) => handleAction({ type: "detail", detail: glossaryDetail(row) })}
            getRowAriaLabel={(row) => `${row.term} 용어 상세`}
          />
        </Card>
      ) : null}
      {activeTab === "리포트 라이브러리" ? (
        REPORTS.length > 0 ? (
          <Card title="학습용 리포트">
            <DataTable<ReportListItem>
              columns={reportColumns((row) => handleAction({ type: "detail", detail: reportDetail(row) }))}
              rows={REPORTS.slice(0, 5)}
              getRowKey={(row) => row.id}
              density="compact"
              onRowClick={(row) => handleAction({ type: "detail", detail: reportDetail(row) })}
              getRowAriaLabel={(row) => `${row.title} 학습 리포트 상세`}
            />
          </Card>
        ) : (
          <EmptyState title="리포트가 없습니다" description="학습과 연결할 리포트 fixture가 없습니다." />
        )
      ) : null}
      <DetailPanel detail={detail} onClose={closeDetail} />
      <ActionNotice message={notice} />
    </PageContainer>
  );
}
