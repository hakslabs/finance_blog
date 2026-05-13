import { Link, useLocation } from "react-router-dom";
import { isNavActive, primaryNavItems, utilityNavItems } from "./navigation";
import styles from "./Sidebar.module.css";

export function Sidebar() {
  const { pathname } = useLocation();

  return (
    <aside className={styles.aside} aria-label="주요 메뉴">
      <Link to="/" className={styles.brand} aria-label="Finance_lab 홈">
        <span className={styles.brandSymbol} aria-hidden="true" />
        <span>
          <span className={styles.brandName} translate="no">
            Finance_lab
          </span>
          <span className={styles.brandMeta}>Investing workspace</span>
        </span>
      </Link>

      <nav className={styles.nav} aria-label="제품 메뉴">
        {primaryNavItems.map((item) => {
          const active = isNavActive(pathname, item);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={active ? styles.linkActive : styles.link}
              aria-current={active ? "page" : undefined}
            >
              <span className={styles.linkLabel}>{item.label}</span>
              <span className={styles.linkLabelEn} translate="no">
                {item.labelEn}
              </span>
            </Link>
          );
        })}
      </nav>

      <nav className={styles.navUtility} aria-label="설정 메뉴">
        {utilityNavItems.map((item) => {
          const active = isNavActive(pathname, item);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={active ? styles.linkActive : styles.link}
              aria-current={active ? "page" : undefined}
            >
              <span className={styles.linkLabel}>{item.label}</span>
              <span className={styles.linkLabelEn} translate="no">
                {item.labelEn}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
