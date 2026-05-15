import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth-state";
import { getUserDisplayName, getUserEmail, getUserInitial } from "../../lib/auth-user";
import { getCurrentNavItem } from "./navigation";
import styles from "./TopBar.module.css";

const TRANSIENT_NOTICE_MS = 2400;

export function TopBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const current = getCurrentNavItem(pathname);
  const auth = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const accountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), TRANSIENT_NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!accountRef.current?.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    }

    if (accountOpen) {
      window.addEventListener("pointerdown", onPointerDown);
    }
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [accountOpen]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const rawQuery = String(data.get("symbol-search") ?? "").trim();
    if (!rawQuery) {
      navigate("/stocks");
      return;
    }
    navigate(`/stocks/${encodeURIComponent(rawQuery.toUpperCase())}`);
  }

  function showPlanned(message: string) {
    setNotice(message);
  }

  async function handleTopBarSignIn() {
    try {
      await auth.signInWithGoogle(window.location.href);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "로그인을 시작하지 못했습니다.",
      );
    }
  }

  async function handleSignOut() {
    try {
      await auth.signOut();
      setAccountOpen(false);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "로그아웃하지 못했습니다.");
    }
  }

  return (
    <header className={styles.bar}>
      <div className={styles.title}>
        <span className={styles.titleKo}>{current.label}</span>
        <span className={styles.titleEn} translate="no">
          {current.labelEn}
        </span>
      </div>

      <form className={styles.search} onSubmit={handleSearch}>
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
      </form>

      <div className={styles.actions}>
        <span className={styles.chip} translate="no">
          KRW
        </span>
        <button
          type="button"
          className={styles.iconButton}
          aria-label="북마크 열기"
          title="북마크"
          onClick={() => showPlanned("북마크 패널은 PR-17 관심종목 쓰기 경로에서 연결됩니다.")}
        >
          <span aria-hidden="true">★</span>
        </button>
        <button
          className={styles.iconButtonNotice}
          type="button"
          aria-label="알림 열기"
          title="알림"
          onClick={() => showPlanned("알림 패널은 신호 알림 저장 기능과 함께 연결됩니다.")}
        >
          <span aria-hidden="true">!</span>
        </button>
        {auth.status === "signed-in" ? (
          <div className={styles.account} ref={accountRef}>
            <button
              type="button"
              className={styles.avatar}
              aria-expanded={accountOpen}
              aria-haspopup="menu"
              aria-label="계정 메뉴 열기"
              title={getUserDisplayName(auth.user)}
              onClick={() => setAccountOpen((open) => !open)}
            >
              {getUserInitial(auth.user)}
            </button>
            {accountOpen ? (
              <div className={styles.accountMenu} role="menu">
                <div className={styles.accountHeader}>
                  <span className={styles.accountName}>
                    {getUserDisplayName(auth.user)}
                  </span>
                  <span className={styles.accountEmail}>{getUserEmail(auth.user)}</span>
                </div>
                <Link
                  className={styles.accountItem}
                  role="menuitem"
                  to="/mypage"
                  onClick={() => setAccountOpen(false)}
                >
                  마이페이지
                </Link>
                <Link
                  className={styles.accountItem}
                  role="menuitem"
                  to="/portfolio"
                  onClick={() => setAccountOpen(false)}
                >
                  포트폴리오
                </Link>
                <button
                  className={styles.accountItemButton}
                  type="button"
                  role="menuitem"
                  onClick={() => void handleSignOut()}
                >
                  로그아웃
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <button
            className={styles.loginButton}
            type="button"
            disabled={auth.status === "loading" || auth.status === "config-error"}
            onClick={() => void handleTopBarSignIn()}
          >
            {auth.status === "loading" ? "확인 중" : "로그인"}
          </button>
        )}
      </div>
      {notice ? (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      ) : null}
    </header>
  );
}
