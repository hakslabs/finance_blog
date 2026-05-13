import { useId, type PropsWithChildren, type ReactNode } from "react";
import styles from "./PageContainer.module.css";

type PageContainerProps = PropsWithChildren<{
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}>;

export function PageContainer({
  eyebrow,
  title,
  description,
  actions,
  children,
}: PageContainerProps) {
  const titleId = useId();

  return (
    <section className={styles.container} aria-labelledby={titleId}>
      <div className={styles.header}>
        <div className={styles.copy}>
          {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
          <h1 id={titleId} className={styles.title}>
            {title}
          </h1>
          {description ? <p className={styles.description}>{description}</p> : null}
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
      {children ? <div className={styles.body}>{children}</div> : null}
    </section>
  );
}
