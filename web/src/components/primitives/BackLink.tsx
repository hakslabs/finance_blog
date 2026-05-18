import { Link } from "react-router-dom";
import styles from "./BackLink.module.css";

type BackLinkProps = {
  to: string;
  label: string;
};

export function BackLink({ to, label }: BackLinkProps) {
  return (
    <Link to={to} className={styles.link}>
      <span className={styles.arrow} aria-hidden="true">←</span>
      <span>{label}</span>
    </Link>
  );
}
