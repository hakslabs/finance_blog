import { Card } from "../../../components/primitives/Card";
import styles from "../ReportsPage.module.css";

const SORTS = ["최신", "인기", "관련도"] as const;
const CATEGORIES = ["전체", "거시", "산업", "공시", "13F", "리서치"] as const;
const REGIONS = ["전체", "한국", "미국", "글로벌"] as const;
const PERIODS = ["최근 7일", "30일", "90일", "전체"] as const;

function PillGroup({
  label,
  items,
  active,
}: {
  label: string;
  items: readonly string[];
  active: string;
}) {
  return (
    <>
      <span className={styles.filterLabel}>{label}</span>
      {items.map((item) => (
        <span
          key={item}
          className={`${styles.pill} ${item === active ? styles.pillActive : ""}`}
        >
          {item}
        </span>
      ))}
    </>
  );
}

export function ReportFilters() {
  return (
    <Card className={styles.filterCard}>
      <div className={styles.filterTop}>
        <div className={styles.searchBox}>리포트 검색 (제목, 태그, 본문)</div>
        <PillGroup label="정렬:" items={SORTS} active="최신" />
      </div>
      <div className={styles.pillGroup}>
        <PillGroup label="카테고리:" items={CATEGORIES} active="전체" />
        <PillGroup label="지역:" items={REGIONS} active="전체" />
        <PillGroup label="기간:" items={PERIODS} active="30일" />
      </div>
    </Card>
  );
}
