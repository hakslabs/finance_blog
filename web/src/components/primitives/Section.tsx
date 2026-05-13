import { useId, type PropsWithChildren, type ReactNode } from "react";
import styles from "./Section.module.css";

type SectionProps = PropsWithChildren<{
  title: string;
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
}>;

export function Section({
  title,
  eyebrow,
  description,
  actions,
  children,
}: SectionProps) {
  const titleId = useId();

  return (
    <section className={styles.section} aria-labelledby={titleId}>
      <div className={styles.header}>
        <div>
          {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          {description ? (
            <p className={styles.description}>{description}</p>
          ) : null}
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}
