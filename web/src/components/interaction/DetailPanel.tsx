import type { DetailContent } from "../../lib/interaction/action-intent";
import { Badge } from "../primitives/Badge";
import styles from "./DetailPanel.module.css";

type DetailPanelProps = {
  detail: DetailContent | null;
  onClose: () => void;
};

export function DetailPanel({ detail, onClose }: DetailPanelProps) {
  if (!detail) return null;

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={onClose}>
      <aside
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="interaction-detail-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            {detail.eyebrow ? <p className={styles.eyebrow}>{detail.eyebrow}</p> : null}
            <h2 id="interaction-detail-title" className={styles.title}>
              {detail.title}
            </h2>
            {detail.meta ? <p className={styles.meta}>{detail.meta}</p> : null}
          </div>
          <button type="button" className={styles.close} onClick={onClose}>
            닫기
          </button>
        </header>

        {detail.summary ? <p className={styles.summary}>{detail.summary}</p> : null}

        {detail.tags?.length ? (
          <div className={styles.tags}>
            {detail.tags.map((tag) => (
              <Badge key={tag} tone="neutral">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}

        {detail.sections?.length ? (
          <div className={styles.sections}>
            {detail.sections.map((section) => (
              <section key={section.title}>
                <h3>{section.title}</h3>
                <p>{section.body}</p>
              </section>
            ))}
          </div>
        ) : null}
      </aside>
    </div>
  );
}
