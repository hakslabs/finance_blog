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
import type { GlossaryTerm, GuideArticle, LearnTab } from "../../fixtures/learn";
import { REPORTS } from "../../fixtures/reports";
import type { ReportListItem } from "../../fixtures/reports";
import styles from "./LearnPage.module.css";

const reportColumns = (onOpenReport: (row: ReportListItem) => void) => [
  {
    key: "title",
    header: "리포트",
    render: (row: ReportListItem) => (
      <button type="button" className={styles.textButton} onClick={() => onOpenReport(row)}>
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
        title: "읽기 목표",
        body: "핵심 개념을 실제 투자 판단과 연결해 이해하는 것이 목표입니다.",
      },
      {
        title: "후속 연결",
        body: "학습 진행률과 북마크 저장은 저장 항목 PR에서 연결됩니다.",
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
        title: "학습 포인트",
        body: "이 리포트는 학습 탭에서 읽을거리로 연결되며, 전체 상세는 리포트 페이지에서 확인합니다.",
      },
    ],
  };
}

function Guides({
  articles,
  onOpenArticle,
}: {
  articles: GuideArticle[];
  onOpenArticle: (article: GuideArticle) => void;
}) {
  return (
    <div className={styles.guideGrid}>
      <Card title="카테고리">
        <div className={styles.categoryList}>
          {LEARN_CATEGORIES.map((category) => (
            <div key={category.id} className={styles.categoryRow}>
              <span>{category.title}</span>
              <span>{category.count}편</span>
            </div>
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
          onClick={() => handleAction({ type: "detail", detail: glossaryDetail(row) })}
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
        />
      ) : null}
      {activeTab === "용어 사전" ? (
        <Card title="용어 사전" eyebrow="1,240개">
          <DataTable<GlossaryTerm> columns={glossaryColumns} rows={GLOSSARY_TERMS} getRowKey={(row) => row.id} density="compact" />
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
