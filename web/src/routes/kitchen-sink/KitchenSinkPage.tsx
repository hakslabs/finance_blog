import { Badge } from "../../components/primitives/Badge";
import { Card } from "../../components/primitives/Card";
import { ChartPlaceholder } from "../../components/primitives/ChartPlaceholder";
import {
  DataTable,
  type DataTableColumn,
} from "../../components/primitives/DataTable";
import { EmptyState } from "../../components/primitives/EmptyState";
import { KpiTile } from "../../components/primitives/KpiTile";
import { Section } from "../../components/primitives/Section";
import { PageContainer } from "../../components/layout/PageContainer";

type SampleRow = {
  symbol: string;
  name: string;
  change: string;
};

const rows: SampleRow[] = [
  { symbol: "AAPL", name: "Apple Inc.", change: "+1.2%" },
  { symbol: "MSFT", name: "Microsoft", change: "-0.4%" },
  { symbol: "SPY", name: "S&P 500 ETF", change: "+0.3%" },
];

const columns: DataTableColumn<SampleRow>[] = [
  { key: "symbol", header: "티커", render: (row) => row.symbol },
  { key: "name", header: "이름", render: (row) => row.name },
  {
    key: "change",
    header: "변동",
    align: "right",
    render: (row) => row.change,
  },
];

export function KitchenSinkPage() {
  return (
    <PageContainer
      eyebrow="PR-02"
      title="프리미티브 점검"
      description="공통 레이아웃과 재사용 UI의 분리 상태를 확인하는 개발용 화면입니다."
    >
      <div className="kitchen-grid">
        <KpiTile label="Watchlist" value="12" detail="관심종목" />
        <KpiTile label="Thesis Locked" value="60%" detail="MVP 목표" />
        <KpiTile label="Alerts" value="3" detail="오늘 확인" />
      </div>

      <Section title="Shared Cards" eyebrow="Components">
        <div className="kitchen-grid kitchen-grid--two">
          <Card title="상태 배지" eyebrow="Badge">
            <div className="badge-row">
              <Badge>Neutral</Badge>
              <Badge tone="accent">Accent</Badge>
              <Badge tone="positive">Positive</Badge>
              <Badge tone="negative">Negative</Badge>
              <Badge tone="warning">Warning</Badge>
            </div>
          </Card>
          <Card title="차트 영역" eyebrow="Chart">
            <ChartPlaceholder label="real chart adapter lands in a later PR" />
          </Card>
        </div>
      </Section>

      <Section title="Data Table" eyebrow="Table">
        <Card>
          <DataTable
            columns={columns}
            rows={rows}
            getRowKey={(row) => row.symbol}
          />
        </Card>
      </Section>

      <EmptyState
        title="아직 데이터가 없습니다"
        description="실제 API 연결 전까지는 fixture 또는 명시적 빈 상태만 보여줍니다."
      />
    </PageContainer>
  );
}
