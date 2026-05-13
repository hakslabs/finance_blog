import type { PropsWithChildren } from "react";

type BadgeTone = "neutral" | "accent" | "positive" | "negative" | "warning";

type BadgeProps = PropsWithChildren<{
  tone?: BadgeTone;
}>;

export function Badge({ tone = "neutral", children }: BadgeProps) {
  return <span className={`ui-badge ui-badge--${tone}`}>{children}</span>;
}
