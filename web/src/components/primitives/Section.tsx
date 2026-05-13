import type { PropsWithChildren, ReactNode } from "react";

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
  return (
    <section className="ui-section" aria-labelledby={`${title}-section-title`}>
      <div className="ui-section__header">
        <div>
          {eyebrow ? <p className="ui-eyebrow">{eyebrow}</p> : null}
          <h2 id={`${title}-section-title`}>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {actions ? <div className="ui-section__actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}
