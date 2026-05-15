import styles from "./Skeleton.module.css";

type SkeletonVariant = "text" | "title" | "block" | "circle";

type SkeletonProps = {
  variant?: SkeletonVariant;
  className?: string;
  label?: string;
};

export function Skeleton({
  variant = "text",
  className,
  label = "불러오는 중",
}: SkeletonProps) {
  return (
    <span
      className={[styles.skeleton, styles[variant], className]
        .filter(Boolean)
        .join(" ")}
      role="status"
      aria-label={label}
    />
  );
}
