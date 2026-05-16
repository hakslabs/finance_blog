import { Card } from "../../../components/primitives/Card";
import type { FinancialTable } from "../../../fixtures/stocks";
import { useStockFinancials } from "../../../lib/useStockExtras";
import type { FinancialLine, FinancialPeriod } from "../../../lib/api-client";
import styles from "./FinancialsSection.module.css";

type FinancialsSectionProps = {
  symbol: string;
  incomeStatement: FinancialTable;
  balanceSheet: FinancialTable;
  cashFlow: FinancialTable;
  keyRatios: FinancialTable;
};

function formatNum(value: number | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toFixed(2);
}

function LiveFinancialsCard({ period, kind, title }: {
  period: FinancialPeriod;
  kind: "income_statement" | "balance_sheet" | "cash_flow";
  title: string;
}) {
  const lines: FinancialLine[] = (period[kind] || []).slice(0, 10);
  const eyebrow = `${period.period ?? ""}${period.form ? ` · ${period.form}` : ""}`;
  return (
    <Card title={title} eyebrow={eyebrow}>
      <table className={styles.finTable}>
        <thead>
          <tr>
            <th>항목</th>
            <th>값</th>
            <th>단위</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => (
            <tr key={`${kind}-${i}`}>
              <td>{line.label ?? line.concept ?? "—"}</td>
              <td>{formatNum(line.value)}</td>
              <td>{line.unit ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function FinTable({ table }: { table: FinancialTable }) {
  return (
    <>
      {table.hint && <p className={styles.hint}>{table.hint}</p>}
      <table className={styles.finTable}>
        <thead>
          <tr>
            {table.headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((r) => (
            <tr key={r.id} className={r.bold ? styles.boldRow : ""}>
              <td>{r.item}</td>
            {r.values.map((v, i) => (
              <td key={`${r.id}-${table.headers[i + 1] || `col${i}`}`}>{v}</td>
            ))}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export function FinancialsSection({
  symbol,
  incomeStatement,
  balanceSheet,
  cashFlow,
  keyRatios,
}: FinancialsSectionProps) {
  const live = useStockFinancials(symbol, "annual");
  const latest = live.status === "ready" ? live.data.periods[0] : null;
  const sourceLabel =
    live.status === "ready" && latest
      ? `Finnhub financials-reported · ${live.data.freq} · ${live.data.periods.length}기`
      : live.status === "loading"
        ? "Finnhub 로딩 중 · fixture 표시"
        : live.status === "error"
          ? "Finnhub 오류 · fixture 표시"
          : "Finnhub 빈 결과 · fixture 표시";

  return (
    <div className={styles.container}>
      <div className={styles.subTabs}>
        <span className={styles.subTabActive}>손익계산서</span>
        <span className={styles.subTab}>재무상태표</span>
        <span className={styles.subTab}>현금흐름표</span>
        <span className={styles.spacer} aria-hidden="true" />
        <span className={styles.subTabActive}>연간</span>
        <span className={styles.subTab}>분기</span>
      </div>

      <p className={styles.hint}>출처: {sourceLabel}</p>

      {latest ? (
        <>
          <LiveFinancialsCard period={latest} kind="income_statement" title="손익계산서 (Finnhub 라이브)" />
          <div className={styles.finGrid}>
            <LiveFinancialsCard period={latest} kind="balance_sheet" title="재무상태표 (Finnhub 라이브)" />
            <LiveFinancialsCard period={latest} kind="cash_flow" title="현금흐름표 (Finnhub 라이브)" />
          </div>
        </>
      ) : (
        <>
          <Card title={`${incomeStatement.title}`} eyebrow={incomeStatement.hint}>
            <FinTable table={incomeStatement} />
          </Card>
          <div className={styles.finGrid}>
            <Card title={balanceSheet.title} eyebrow={balanceSheet.hint}>
              <FinTable table={balanceSheet} />
            </Card>
            <Card title={cashFlow.title} eyebrow={cashFlow.hint}>
              <FinTable table={cashFlow} />
            </Card>
          </div>
        </>
      )}

      <Card title={keyRatios.title}>
        <FinTable table={keyRatios} />
      </Card>
    </div>
  );
}
