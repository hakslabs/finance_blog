import type { PropsWithChildren, ReactNode } from "react";

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
  const classes = ["ui-card", className].filter(Boolean).join(" ");

  return (
    <article className={classes}>
      {title || eyebrow || actions ? (
        <div className="ui-card__header">
          <div>
            {eyebrow ? <p className="ui-eyebrow">{eyebrow}</p> : null}
            {title ? <h2>{title}</h2> : null}
          </div>
          {actions ? <div className="ui-card__actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </article>
  );
}
