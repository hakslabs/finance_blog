import type { PropsWithChildren } from "react";
import styles from "./Badge.module.css";

type BadgeTone = "neutral" | "accent" | "positive" | "negative" | "warning";

type BadgeProps = PropsWithChildren<{
  tone?: BadgeTone;
}>;

const toneClass: Record<BadgeTone, string> = {
  neutral: styles.badge,
  accent: styles.accent,
  positive: styles.positive,
  negative: styles.negative,
  warning: styles.warning,
};

export function Badge({ tone = "neutral", children }: BadgeProps) {
  return <span className={toneClass[tone]}>{children}</span>;
}
