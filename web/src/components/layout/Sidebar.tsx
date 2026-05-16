import { Link, useLocation } from "react-router-dom";
import { Menu, PanelLeftOpen } from "lucide-react";
import { useAuth } from "../../lib/auth-state";
import { isAdminUser } from "../../lib/auth-user";
import { useLanguage } from "../../lib/language";
import { getVisibleNavItems, isNavActive, primaryNavItems, utilityNavItems } from "./navigation";
import styles from "./Sidebar.module.css";

type SidebarProps = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

export function Sidebar({ collapsed, onToggleCollapsed }: SidebarProps) {
  const { pathname } = useLocation();
  const auth = useAuth();
  const isAdmin = auth.status === "signed-in" && isAdminUser(auth.user);
  const visibleUtilityNavItems = getVisibleNavItems(utilityNavItems, isAdmin);
  const { lang } = useLanguage();
  const primaryLabel = (label: string, labelEn: string) =>
    lang === "en" ? labelEn : label;
  const secondaryLabel = (label: string, labelEn: string) =>
    lang === "en" ? label : labelEn;

  return (
    <aside
      className={collapsed ? styles.asideCollapsed : styles.aside}
      aria-label="주요 메뉴"
    >
      <div className={styles.header}>
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
          title={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
          onClick={onToggleCollapsed}
        >
          {collapsed ? (
            <PanelLeftOpen size={16} aria-hidden="true" strokeWidth={1.8} />
          ) : (
            <Menu size={16} aria-hidden="true" strokeWidth={1.8} />
          )}
          <span className="sr-only">메뉴 {collapsed ? "펼치기" : "접기"}</span>
        </button>
      </div>

      <nav className={styles.nav} aria-label="제품 메뉴">
        {primaryNavItems.map((item) => {
          const active = isNavActive(pathname, item);
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={active ? styles.linkActive : styles.link}
              aria-current={active ? "page" : undefined}
              aria-label={primaryLabel(item.label, item.labelEn)}
              title={collapsed ? primaryLabel(item.label, item.labelEn) : undefined}
            >
              <span className={styles.linkIcon} aria-hidden="true">
                <Icon size={18} strokeWidth={1.9} />
              </span>
              <span className={styles.linkLabel}>
                {primaryLabel(item.label, item.labelEn)}
              </span>
              <span className={styles.linkLabelEn} translate="no">
                {secondaryLabel(item.label, item.labelEn)}
              </span>
            </Link>
          );
        })}
      </nav>

      <nav className={styles.navUtility} aria-label="설정 메뉴">
        {visibleUtilityNavItems.map((item) => {
          const active = isNavActive(pathname, item);
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={active ? styles.linkActive : styles.link}
              aria-current={active ? "page" : undefined}
              aria-label={primaryLabel(item.label, item.labelEn)}
              title={collapsed ? primaryLabel(item.label, item.labelEn) : undefined}
            >
              <span className={styles.linkIcon} aria-hidden="true">
                <Icon size={18} strokeWidth={1.9} />
              </span>
              <span className={styles.linkLabel}>
                {primaryLabel(item.label, item.labelEn)}
              </span>
              <span className={styles.linkLabelEn} translate="no">
                {secondaryLabel(item.label, item.labelEn)}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
