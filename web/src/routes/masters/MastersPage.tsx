import { Link, useNavigate } from "react-router-dom";
import { PageContainer } from "../../components/layout/PageContainer";
import { Badge } from "../../components/primitives/Badge";
import { BookmarkButton } from "../../components/primitives/BookmarkButton";
import { Card } from "../../components/primitives/Card";
import { DataSource } from "../../components/primitives/DataSource";
import { DataTable } from "../../components/primitives/DataTable";
import { MASTERS } from "../../fixtures/masters";
import type { MasterListItem, MasterStrategy } from "../../fixtures/masters";
import { useMasters } from "../../lib/useMasters";
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

const NAME_COL = {
  key: "name",
  header: "거장",
  render: (row: MasterListItem) => (
    <Link to={`/masters/${row.id}`} className={styles.masterLink}>
      <span className={styles.name}>{row.name}</span>
      <span className={styles.firm}>{row.firm} · {row.style}</span>
    </Link>
  ),
};
const STRATEGY_COL = {
  key: "strategy",
  header: "전략",
  render: (row: MasterListItem) => (
    <span className={styles.badges}>
      {row.strategy.map((strategy) => (
        <Badge key={strategy} tone={STRATEGY_TONE[strategy]}>{strategy}</Badge>
      ))}
    </span>
  ),
};
const AUM_COL = { key: "aum", header: "AUM", align: "right" as const, render: (row: MasterListItem) => <span className={styles.mono}>{row.aum}</span> };
const HOLDINGS_COL = { key: "holdings", header: "보유", align: "right" as const, render: (row: MasterListItem) => <span className={styles.mono}>{row.holdingsCount}</span> };
const FILING_COL = { key: "filing", header: "최근 신고", render: (row: MasterListItem) => row.latestFiling };
const CAGR_COL = { key: "cagr", header: "5Y CAGR", align: "right" as const, render: (row: MasterListItem) => <span className={styles.mono}>{row.cagr5y}</span> };

export function MastersPage() {
  const navigate = useNavigate();
  const live = useMasters();
  const liveRows: MasterListItem[] = live.status === "ready"
    ? live.data.masters.map((m) => ({
        id: m.slug,
        name: m.name,
        firm: m.firm ?? "—",
        strategy: [],
        style: m.style ?? "—",
        aum: m.aum != null
          ? `$${(m.aum / 1e9).toFixed(1)}B`
          : "—",
        holdingsCount: 0,
        latestFiling: "—",
        cagr5y: "—",
      }))
    : [];
  const usingLive = liveRows.length > 0;
  const rows = usingLive ? liveRows : MASTERS;
  const columns = [
    {
      key: "bookmark",
      header: "저장",
      render: (row: MasterListItem) => (
        <BookmarkButton
          kind="master"
          refId={row.id}
          title={`${row.name} · ${row.firm}`}
        />
      ),
    },
    NAME_COL,
    ...(usingLive ? [] : [STRATEGY_COL]),
    AUM_COL,
    ...(usingLive ? [] : [HOLDINGS_COL, FILING_COL, CAGR_COL]),
  ];
  return (
    <PageContainer
      eyebrow="Masters"
      title="고수 따라잡기"
      actions={
        <DataSource
          state={usingLive ? "live" : live.status === "loading" ? "loading" : "fixture"}
          source={usingLive ? "/v1/masters" : "MASTERS"}
          detail={usingLive ? `${liveRows.length}명` : undefined}
        />
      }
    >
      <Card title="거장 목록" eyebrow="13F + 투자 철학">
        <DataTable<MasterListItem>
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.id}
          density="compact"
          emptyMessage="거장 목록이 없습니다."
          onRowClick={(row) => navigate(`/masters/${encodeURIComponent(row.id)}`)}
          getRowAriaLabel={(row) => `${row.name} 거장 상세`}
        />
      </Card>
    </PageContainer>
  );
}
