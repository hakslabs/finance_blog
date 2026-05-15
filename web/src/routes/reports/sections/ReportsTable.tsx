import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { Badge } from "../../../components/primitives/Badge";
import { Card } from "../../../components/primitives/Card";
import { DataTable } from "../../../components/primitives/DataTable";
import { EmptyState } from "../../../components/primitives/EmptyState";
import type {
  ReportCategory,
  ReportListItem,
  ReportRegion,
  ReportStatus,
} from "../../../fixtures/reports";
import styles from "../ReportsPage.module.css";

type BadgeTone = "neutral" | "accent" | "positive" | "negative" | "warning";

const REGION_LABEL: Record<ReportRegion, string> = {
  KR: "KR",
  US: "US",
  GLOBAL: "GLOBAL",
};

const REGION_TONE: Record<ReportRegion, BadgeTone> = {
  KR: "positive",
  US: "accent",
  GLOBAL: "neutral",
};

const CATEGORY_TONE: Record<ReportCategory, BadgeTone> = {
  거시: "warning",
  "13F": "accent",
  리서치: "neutral",
  공시: "negative",
  산업: "positive",
};

const STATUS_TONE: Record<ReportStatus, BadgeTone> = {
  complete: "accent",
  processing: "neutral",
};

const STATUS_LABEL: Record<ReportStatus, string> = {
  complete: "AI 요약",
  processing: "처리중",
};

const columns = [
  {
    key: "title",
    header: "리포트",
    render: (row: ReportListItem) => (
      <Link to={`/reports/${row.id}`} className={styles.titleLink}>
        <span className={styles.titleText}>{row.title}</span>
        <span className={styles.summary}>{row.summary}</span>
        <span className={styles.meta}>
          {row.source} · {row.subtype} · {row.pages}p · {row.language.toUpperCase()}
        </span>
      </Link>
    ),
  },
  {
    key: "type",
    header: "분류",
    render: (row: ReportListItem) => (
      <span className={styles.tagList}>
        <Badge tone={REGION_TONE[row.region]}>{REGION_LABEL[row.region]}</Badge>
        <Badge tone={CATEGORY_TONE[row.category]}>{row.category}</Badge>
      </span>
    ),
  },
  {
    key: "status",
    header: "상태",
    render: (row: ReportListItem) => (
      <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Badge>
    ),
  },
  {
    key: "tags",
    header: "태그",
    render: (row: ReportListItem) => (
      <span className={styles.tagList}>
        {row.tags.map((tag) => (
          <span key={tag} className={styles.tag}>
            #{tag}
          </span>
        ))}
      </span>
    ),
  },
  {
    key: "date",
    header: "발간일",
    align: "right" as const,
    render: (row: ReportListItem) => <span className={styles.date}>{row.date}</span>,
  },
];

type ReportsTableProps = {
  reports: ReportListItem[];
  bookmarkedIds: Set<string>;
  onToggleBookmark: (id: string) => void;
};

export function ReportsTable({
  reports,
  bookmarkedIds,
  onToggleBookmark,
}: ReportsTableProps) {
  const tableColumns = [
    {
      key: "bookmark",
      header: "관심",
      render: (row: ReportListItem) => {
        const active = bookmarkedIds.has(row.id);
        return (
          <button
            type="button"
            className={active ? styles.bookmarkActive : styles.bookmarkButton}
            aria-label={`${row.title} 관심글 ${active ? "해제" : "저장"}`}
            onClick={() => onToggleBookmark(row.id)}
          >
            <Star size={15} aria-hidden="true" fill={active ? "currentColor" : "none"} />
          </button>
        );
      },
    },
    ...columns,
  ];

  return (
    <Card title="수집된 리포트" eyebrow="Library">
      {reports.length > 0 ? (
        <DataTable<ReportListItem>
          columns={tableColumns}
          rows={reports}
          getRowKey={(row) => row.id}
          density="compact"
          emptyMessage="리포트가 없습니다."
        />
      ) : (
        <EmptyState
          title="리포트가 없습니다"
          description="조건에 맞는 리포트가 없습니다."
        />
      )}
    </Card>
  );
}
