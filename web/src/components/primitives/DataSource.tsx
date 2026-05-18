import styles from "./DataSource.module.css";

export type DataSourceState = "live" | "loading" | "empty" | "error" | "fixture";

type DataSourceProps = {
  state: DataSourceState;
  source?: string;
  detail?: string;
};

const LABEL: Record<DataSourceState, string> = {
  live: "라이브",
  loading: "로딩 중",
  empty: "DB 미수록",
  error: "오류",
  fixture: "샘플 데이터",
};

const STATE_CLASS: Record<DataSourceState, string> = {
  live: styles.live,
  loading: styles.loading,
  empty: styles.empty,
  error: styles.error,
  fixture: styles.fixture,
};

export function DataSource({ state, source, detail }: DataSourceProps) {
  const label = LABEL[state];
  const aria = source ? `${label} · ${source}` : label;
  return (
    <span
      className={STATE_CLASS[state]}
      role="status"
      aria-label={detail ? `${aria} · ${detail}` : aria}
    >
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.label}>{label}</span>
      {source ? <span className={styles.source}>· {source}</span> : null}
    </span>
  );
}
