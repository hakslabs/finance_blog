import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../lib/auth-state";
import { getCurrentNavItem } from "./navigation";
import styles from "./TopBar.module.css";

export function TopBar() {
  const { pathname } = useLocation();
  const current = getCurrentNavItem(pathname);
  const auth = useAuth();

  return (
    <header className={styles.bar}>
      <div className={styles.title}>
        <span className={styles.titleKo}>{current.label}</span>
        <span className={styles.titleEn} translate="no">
          {current.labelEn}
        </span>
      </div>

      <label className={styles.search}>
        <span className="sr-only">종목 또는 티커 검색</span>
        <span aria-hidden="true">⌕</span>
        <input
          type="search"
          name="symbol-search"
          placeholder="종목 / 티커 검색…"
          autoComplete="off"
          spellCheck={false}
          className={styles.searchInput}
        />
      </label>

      <div className={styles.actions}>
        <span className={styles.chip} translate="no">
          KRW
        </span>
        <Link
          to="/stocks"
          className={styles.iconButton}
          aria-label="관심종목과 북마크 열기"
          title="관심종목 · 팔로우 · 북마크"
        >
          <span aria-hidden="true">★</span>
        </Link>
        <button
          className={styles.iconButtonNotice}
          type="button"
          aria-label="알림 열기"
          title="알림"
        >
          <span aria-hidden="true">!</span>
        </button>
        <Link
          to="/mypage"
          className={styles.avatar}
          aria-label="마이페이지로 이동"
          title="마이페이지"
        >
          {auth.status === "signed-in" ? auth.user.email?.charAt(0).toUpperCase() : ""}
        </Link>
        <button
          className={styles.iconButton}
          type="button"
          aria-label="로그아웃"
          title="로그아웃"
          onClick={() => void auth.signOut()}
        >
          <span aria-hidden="true">↗</span>
        </button>
      </div>
    </header>
  );
}
