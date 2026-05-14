import { Badge } from "../../../components/primitives/Badge";
import { Card } from "../../../components/primitives/Card";
import { DataTable } from "../../../components/primitives/DataTable";
import type { InflationRow, ReportDetail } from "../../../fixtures/reports";
import styles from "./ReportDetailSections.module.css";

const inflationColumns = [
  {
    key: "label",
    header: "구분",
    render: (row: InflationRow) => row.label,
  },
  {
    key: "dec2024",
    header: "2024.12",
    align: "right" as const,
    render: (row: InflationRow) => row.dec2024,
  },
  {
    key: "jun2025",
    header: "2025.06",
    align: "right" as const,
    render: (row: InflationRow) => row.jun2025,
  },
  {
    key: "aug2025",
    header: "2025.08",
    align: "right" as const,
    render: (row: InflationRow) => row.aug2025,
  },
];

export function ReportBody({ report }: { report: ReportDetail }) {
  return (
    <Card
      title="본문"
      eyebrow="Docling 추출"
      actions={
        <span className={styles.badgeRow}>
          <Badge tone="neutral">한글 원본</Badge>
          <Badge tone="accent">읽기 모드</Badge>
          <Badge tone="neutral">원본 PDF</Badge>
        </span>
      }
    >
      <div className={styles.article}>
        {report.bodySections.map((section, index) => (
          <section key={section.id} className={styles.bodySection}>
            <h3>{section.title}</h3>
            <p>{section.body}</p>
            {index === 1 ? (
              <div className={styles.inlineTable}>
                <p className={styles.tableCaption}>표 1. 주요 물가 지표 (전년동월비, %)</p>
                <DataTable<InflationRow>
                  columns={inflationColumns}
                  rows={report.inflationRows}
                  getRowKey={(row) => row.id}
                  density="compact"
                />
              </div>
            ) : null}
          </section>
        ))}
        <p className={styles.truncated}>이하 110페이지는 마크다운으로 변환된 전체 본문 영역입니다.</p>
      </div>
    </Card>
  );
}
