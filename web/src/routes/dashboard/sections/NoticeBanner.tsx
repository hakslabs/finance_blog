import type { Notice } from "../../../fixtures/dashboard";
import styles from "./NoticeBanner.module.css";

export function NoticeBanner({
  notice,
  onOpen,
}: {
  notice: Notice;
  onOpen?: () => void;
}) {
  return (
    <button type="button" className={styles.banner} onClick={onOpen}>
      <span className={styles.tag}>{notice.tag}</span>
      <span className={styles.title}>{notice.title}</span>
      <span className={styles.desc}>{notice.description}</span>
      <span className={styles.meta}>{notice.date}</span>
    </button>
  );
}
