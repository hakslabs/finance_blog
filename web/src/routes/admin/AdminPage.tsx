import { useEffect, useState, type FormEvent } from "react";
import { PageContainer } from "../../components/layout/PageContainer";
import { Card } from "../../components/primitives/Card";
import { apiClient, type NoticeDb } from "../../lib/api-client";
import styles from "./AdminPage.module.css";

export function AdminPage() {
  const [notices, setNotices] = useState<NoticeDb[]>([]);
  const [tag, setTag] = useState("공지사항");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    try {
      const r = await apiClient.getNotices();
      setNotices(r.items);
    } catch {
      setNotices([]);
    }
  }
  useEffect(() => { void reload(); }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await apiClient.createNotice({ tag, title, description: desc || undefined });
      setTitle("");
      setDesc("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "공지 등록 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageContainer eyebrow="Admin" title="관리자" description="운영 콘솔 — 공지 발행">
      <Card title="새 공지 작성" eyebrow="site_notices INSERT">
        <form onSubmit={onSubmit} className={styles.form}>
          <div className={styles.row}>
            <label className={styles.label}>태그</label>
            <input className={styles.input} value={tag} onChange={(e) => setTag(e.target.value)} maxLength={40} />
          </div>
          <div className={styles.row}>
            <label className={styles.label}>제목</label>
            <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={240} required />
          </div>
          <div className={styles.row}>
            <label className={styles.label}>본문</label>
            <textarea className={styles.textarea} value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={2000} rows={3} />
          </div>
          <div className={styles.actions}>
            <button type="submit" className={styles.submit} disabled={busy || !title.trim()}>
              {busy ? "발행 중…" : "발행"}
            </button>
            {error ? <span className={styles.error}>{error}</span> : null}
          </div>
        </form>
      </Card>

      <Card title={`발행된 공지 (${notices.length})`}>
        {notices.length === 0 ? (
          <p className={styles.empty}>없음.</p>
        ) : (
          <ul className={styles.list}>
            {notices.map((n) => (
              <li key={n.id} className={styles.item}>
                <span className={styles.tagPill}>{n.tag}</span>
                <span className={styles.itemTitle}>{n.title}</span>
                <span className={styles.itemDate}>{n.published_at.slice(0, 10)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </PageContainer>
  );
}
