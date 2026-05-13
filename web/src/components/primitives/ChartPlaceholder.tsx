import styles from "./ChartPlaceholder.module.css";

type ChartPlaceholderProps = {
  label: string;
  height?: number;
};

export function ChartPlaceholder({
  label,
  height = 240,
}: ChartPlaceholderProps) {
  return (
    <div className={styles.placeholder} style={{ minHeight: height }}>
      <span>{label}</span>
    </div>
  );
}
