import { useState } from "react";
import { PageContainer } from "../../components/layout/PageContainer";
import { Badge } from "../../components/primitives/Badge";
import { Card } from "../../components/primitives/Card";
import { DataTable } from "../../components/primitives/DataTable";
import { EmptyState } from "../../components/primitives/EmptyState";
import { GUIDE_ARTICLES, GLOSSARY_TERMS, LEARN_CATEGORIES, LEARN_TABS } from "../../fixtures/learn";
import type { GlossaryTerm, GuideArticle, LearnTab } from "../../fixtures/learn";
import { REPORTS } from "../../fixtures/reports";
import type { ReportListItem } from "../../fixtures/reports";
import styles from "./LearnPage.module.css";

const glossaryColumns = [
  { key: "term", header: "용어", render: (row: GlossaryTerm) => <span className={styles.term}>{row.term}<span>{row.korean}</span></span> },
  { key: "category", header: "분류", render: (row: GlossaryTerm) => <Badge tone="neutral">{row.category}</Badge> },
  { key: "description", header: "설명", render: (row: GlossaryTerm) => row.description },
];

const reportColumns = [
  { key: "title", header: "리포트", render: (row: ReportListItem) => row.title },
  { key: "source", header: "출처", render: (row: ReportListItem) => row.source },
  { key: "category", header: "분류", render: (row: ReportListItem) => <Badge tone="neutral">{row.category}</Badge> },
  { key: "date", header: "발간일", align: "right" as const, render: (row: ReportListItem) => row.date },
];

function Guides({ articles }: { articles: GuideArticle[] }) {
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
            <article key={article.id} className={styles.article}>
              <div className={styles.thumb} aria-hidden="true">Guide</div>
              <div>
                <p>{article.title}</p>
                <span>{article.summary}</span>
                <div className={styles.articleMeta}>
                  <Badge tone="accent">{article.category}</Badge>
                  <span>{article.minutes}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function LearnPage() {
  const [activeTab, setActiveTab] = useState<LearnTab>("입문서·칼럼");

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

      {activeTab === "입문서·칼럼" ? <Guides articles={GUIDE_ARTICLES} /> : null}
      {activeTab === "용어 사전" ? (
        <Card title="용어 사전" eyebrow="1,240개">
          <DataTable<GlossaryTerm> columns={glossaryColumns} rows={GLOSSARY_TERMS} getRowKey={(row) => row.id} density="compact" />
        </Card>
      ) : null}
      {activeTab === "리포트 라이브러리" ? (
        REPORTS.length > 0 ? (
          <Card title="학습용 리포트">
            <DataTable<ReportListItem> columns={reportColumns} rows={REPORTS.slice(0, 5)} getRowKey={(row) => row.id} density="compact" />
          </Card>
        ) : (
          <EmptyState title="리포트가 없습니다" description="학습과 연결할 리포트 fixture가 없습니다." />
        )
      ) : null}
    </PageContainer>
  );
}
