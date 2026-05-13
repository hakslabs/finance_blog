import { Link, useLocation } from "react-router-dom";
import { getCurrentNavItem } from "./navigation";

export function TopBar() {
  const { pathname } = useLocation();
  const current = getCurrentNavItem(pathname);

  return (
    <header className="top-bar">
      <div className="top-bar__title">
        <span>{current.label}</span>
        <span translate="no">{current.labelEn}</span>
      </div>

      <label className="top-bar__search">
        <span className="sr-only">종목 또는 티커 검색</span>
        <span aria-hidden="true">⌕</span>
        <input
          type="search"
          name="symbol-search"
          placeholder="종목 / 티커 검색…"
          autoComplete="off"
          spellCheck={false}
        />
      </label>

      <div className="top-bar__actions">
        <span className="currency-chip" translate="no">
          KRW
        </span>
        <Link
          to="/stocks"
          className="icon-button"
          aria-label="관심종목과 북마크 열기"
          title="관심종목 · 팔로우 · 북마크"
        >
          <span aria-hidden="true">★</span>
        </Link>
        <button
          className="icon-button icon-button--notice"
          type="button"
          aria-label="알림 열기"
          title="알림"
        >
          <span aria-hidden="true">!</span>
        </button>
        <Link
          to="/mypage"
          className="avatar-button"
          aria-label="마이페이지로 이동"
          title="마이페이지"
        />
      </div>
    </header>
  );
}
