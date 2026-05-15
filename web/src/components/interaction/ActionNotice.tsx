import styles from "./ActionNotice.module.css";

type ActionNoticeProps = {
  message: string | null;
};

export function ActionNotice({ message }: ActionNoticeProps) {
  if (!message) return null;
  return (
    <div className={styles.notice} role="status" aria-live="polite">
      {message}
    </div>
  );
}
