import { Link, useLocation } from "react-router-dom";
import { isNavActive, primaryNavItems, utilityNavItems } from "./navigation";

export function Sidebar() {
  const { pathname } = useLocation();

  return (
    <aside className="app-sidebar" aria-label="주요 메뉴">
      <Link to="/" className="brand-mark" aria-label="Finance_lab 홈">
        <span className="brand-mark__symbol" aria-hidden="true" />
        <span>
          <span className="brand-mark__name" translate="no">
            Finance_lab
          </span>
          <span className="brand-mark__meta">Investing workspace</span>
        </span>
      </Link>

      <nav className="sidebar-nav" aria-label="제품 메뉴">
        {primaryNavItems.map((item) => {
          const active = isNavActive(pathname, item);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={
                active ? "sidebar-nav__link is-active" : "sidebar-nav__link"
              }
              aria-current={active ? "page" : undefined}
            >
              <span>{item.label}</span>
              <span translate="no">{item.labelEn}</span>
            </Link>
          );
        })}
      </nav>

      <nav className="sidebar-nav sidebar-nav--utility" aria-label="설정 메뉴">
        {utilityNavItems.map((item) => {
          const active = isNavActive(pathname, item);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={
                active ? "sidebar-nav__link is-active" : "sidebar-nav__link"
              }
              aria-current={active ? "page" : undefined}
            >
              <span>{item.label}</span>
              <span translate="no">{item.labelEn}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
