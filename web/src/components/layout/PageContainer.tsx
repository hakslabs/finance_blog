import type { PropsWithChildren, ReactNode } from "react";

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
  return (
    <section className="page-container" aria-labelledby="page-title">
      <div className="page-header">
        <div className="page-header__copy">
          {eyebrow ? <p className="page-eyebrow">{eyebrow}</p> : null}
          <h1 id="page-title">{title}</h1>
          {description ? <p>{description}</p> : null}
        </div>
        {actions ? <div className="page-header__actions">{actions}</div> : null}
      </div>
      {children ? <div className="page-body">{children}</div> : null}
    </section>
  );
}
