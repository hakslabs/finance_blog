import { Link } from "react-router-dom";
import { PageContainer } from "../../components/layout/PageContainer";
import { Badge } from "../../components/primitives/Badge";
import { Card } from "../../components/primitives/Card";
import { DataTable } from "../../components/primitives/DataTable";
import { MASTERS } from "../../fixtures/masters";
import type { MasterListItem, MasterStrategy } from "../../fixtures/masters";
import styles from "./MastersPage.module.css";

type BadgeTone = "neutral" | "accent" | "positive" | "negative" | "warning";

const STRATEGY_TONE: Record<MasterStrategy, BadgeTone> = {
  가치: "positive",
  매크로: "accent",
  성장: "warning",
  혁신: "accent",
  컨트래리언: "negative",
  멘탈모델: "neutral",
  정량: "neutral",
};

const columns = [
  {
    key: "name",
    header: "거장",
    render: (row: MasterListItem) => (
      <Link to={`/masters/${row.id}`} className={styles.masterLink}>
        <span className={styles.name}>{row.name}</span>
        <span className={styles.firm}>{row.firm} · {row.style}</span>
      </Link>
    ),
  },
  {
    key: "strategy",
    header: "전략",
    render: (row: MasterListItem) => (
      <span className={styles.badges}>
        {row.strategy.map((strategy) => (
          <Badge key={strategy} tone={STRATEGY_TONE[strategy]}>{strategy}</Badge>
        ))}
      </span>
    ),
  },
  { key: "aum", header: "AUM", align: "right" as const, render: (row: MasterListItem) => <span className={styles.mono}>{row.aum}</span> },
  { key: "holdings", header: "보유", align: "right" as const, render: (row: MasterListItem) => <span className={styles.mono}>{row.holdingsCount}</span> },
  { key: "filing", header: "최근 신고", render: (row: MasterListItem) => row.latestFiling },
  { key: "cagr", header: "5Y CAGR", align: "right" as const, render: (row: MasterListItem) => <span className={styles.mono}>{row.cagr5y}</span> },
];

export function MastersPage() {
  return (
    <PageContainer
      eyebrow="Masters"
      title="고수 따라잡기"
      description="거장들의 포트폴리오, 투자 철학, 13F 분기 변화를 정적으로 훑어봅니다."
    >
      <Card title="거장 목록" eyebrow="13F + 투자 철학">
        <DataTable<MasterListItem>
          columns={columns}
          rows={MASTERS}
          getRowKey={(row) => row.id}
          density="compact"
          emptyMessage="거장 목록이 없습니다."
        />
      </Card>
    </PageContainer>
  );
}
