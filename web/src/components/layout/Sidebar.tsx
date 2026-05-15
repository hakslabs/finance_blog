import { Link, useLocation } from "react-router-dom";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { isNavActive, primaryNavItems, utilityNavItems } from "./navigation";
import styles from "./Sidebar.module.css";

type SidebarProps = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

function getNavInitial(label: string) {
  return label.slice(0, 1);
}

export function Sidebar({ collapsed, onToggleCollapsed }: SidebarProps) {
  const { pathname } = useLocation();

  return (
    <aside
      className={collapsed ? styles.asideCollapsed : styles.aside}
      aria-label="주요 메뉴"
    >
      <Link to="/" className={styles.brand} aria-label="Finance_lab 홈">
        <span className={styles.brandSymbol} aria-hidden="true" />
        <span className={styles.brandText}>
          <span className={styles.brandName} translate="no">
            Finance_lab
          </span>
          <span className={styles.brandMeta}>Investing workspace</span>
        </span>
      </Link>

      <button
        type="button"
        className={styles.collapseButton}
        aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
        aria-expanded={!collapsed}
        onClick={onToggleCollapsed}
      >
        {collapsed ? (
          <PanelLeftOpen size={16} aria-hidden="true" />
        ) : (
          <PanelLeftClose size={16} aria-hidden="true" />
        )}
        <span>메뉴 {collapsed ? "펼치기" : "접기"}</span>
      </button>

      <nav className={styles.nav} aria-label="제품 메뉴">
        {primaryNavItems.map((item) => {
          const active = isNavActive(pathname, item);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={active ? styles.linkActive : styles.link}
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
              title={collapsed ? item.label : undefined}
            >
              <span className={styles.linkInitial} aria-hidden="true">
                {getNavInitial(item.label)}
              </span>
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
              aria-label={item.label}
              title={collapsed ? item.label : undefined}
            >
              <span className={styles.linkInitial} aria-hidden="true">
                {getNavInitial(item.label)}
              </span>
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
