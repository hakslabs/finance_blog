import { formatCurrency, type Currency } from "../../lib/currency";
import styles from "./Money.module.css";

type MoneyProps = {
  value: number | null | undefined;
  currency: Currency;
  /** "full" = $1,234.56 / ₩1,234,000 (default). "short" = $1.2B / ₩3.5억. */
  mode?: "full" | "short";
  /** Always show a leading + on positive, - on negative. */
  showSign?: boolean;
  /** Override the missing-value placeholder. Defaults to "—" muted. */
  emptyText?: string;
  className?: string;
};

function formatShort(value: number, currency: Currency): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  const prefix = currency === "KRW" ? "₩" : "$";
  if (currency === "KRW") {
    if (abs >= 1e8) return `${sign}${prefix}${(abs / 1e8).toFixed(1)}억`;
    if (abs >= 1e4) return `${sign}${prefix}${(abs / 1e4).toFixed(0)}만`;
    return formatCurrency(value, currency);
  }
  if (abs >= 1e9) return `${sign}${prefix}${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}${prefix}${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}${prefix}${(abs / 1e3).toFixed(1)}K`;
  return formatCurrency(value, currency);
}

export function Money({
  value,
  currency,
  mode = "full",
  showSign = false,
  emptyText = "—",
  className,
}: MoneyProps) {
  if (value == null || Number.isNaN(value)) {
    return <span className={`${styles.empty} ${className ?? ""}`}>{emptyText}</span>;
  }
  const formatted = mode === "short" ? formatShort(value, currency) : formatCurrency(value, currency);
  // formatCurrency emits "$123.45" with no leading +. Add it when requested.
  const display = showSign && value > 0 ? `+${formatted}` : formatted;
  return <span className={`${styles.value} ${className ?? ""}`}>{display}</span>;
}
