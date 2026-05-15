import styles from "./ChartPlaceholder.module.css";

type ChartPlaceholderProps = {
  label: string;
  height?: number;
  onOpen?: () => void;
};

export function ChartPlaceholder({
  label,
  height = 240,
  onOpen,
}: ChartPlaceholderProps) {
  if (onOpen) {
    return (
      <button
        type="button"
        className={styles.placeholderButton}
        style={{ minHeight: height }}
        onClick={onOpen}
      >
        <span>{label}</span>
      </button>
    );
  }

  return (
    <div className={styles.placeholder} style={{ minHeight: height }}>
      <span>{label}</span>
    </div>
  );
}
