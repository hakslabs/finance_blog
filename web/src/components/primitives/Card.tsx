import type { PropsWithChildren, ReactNode } from "react";
import styles from "./Card.module.css";

type CardProps = PropsWithChildren<{
  title?: string;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
}>;

export function Card({
  title,
  eyebrow,
  actions,
  className,
  children,
}: CardProps) {
  const classes = [styles.card, className].filter(Boolean).join(" ");

  return (
    <article className={classes}>
      {title || eyebrow || actions ? (
        <div className={styles.header}>
          <div>
            {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
            {title ? <h2 className={styles.title}>{title}</h2> : null}
          </div>
          {actions ? <div className={styles.actions}>{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </article>
  );
}
