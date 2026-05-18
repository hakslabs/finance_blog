import { useEffect, useState } from "react";
import { apiClient } from "../../../lib/api-client";
import type { Notice } from "../../../fixtures/dashboard";
import styles from "./NoticeBanner.module.css";

export function NoticeBanner({
  notice,
  onOpen,
}: {
  notice: Notice;
  onOpen?: () => void;
}) {
  const [live, setLive] = useState<Notice | null>(null);
  useEffect(() => {
    let cancelled = false;
    apiClient
      .getNotices()
      .then((r) => {
        if (cancelled) return;
        const top = r.items[0];
        if (top) {
          setLive({
            tag: top.tag,
            title: top.title,
            description: top.description ?? "",
            date: top.published_at.slice(0, 10),
          });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  const shown = live ?? notice;
  return (
    <button type="button" className={styles.banner} onClick={onOpen}>
      <span className={styles.tag}>{shown.tag}</span>
      <span className={styles.title}>{shown.title}</span>
      <span className={styles.desc}>{shown.description}</span>
      <span className={styles.meta}>{shown.date}</span>
    </button>
  );
}
