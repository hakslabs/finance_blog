import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Bell,
  Bookmark,
  BriefcaseBusiness,
  ChevronDown,
  CircleDollarSign,
  FileText,
  Home,
  LogOut,
  Search,
  User,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth-state";
import { getUserDisplayName, getUserEmail, getUserInitial } from "../../lib/auth-user";
import { getCurrentNavItem } from "./navigation";
import styles from "./TopBar.module.css";

const TRANSIENT_NOTICE_MS = 2400;
const INITIAL_NOTIFICATIONS = [
  "AAPL 배당락 전 포지션 점검",
  "NVDA Thesis 조건 검토",
] as const;

export function TopBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const current = getCurrentNavItem(pathname);
  const auth = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(
    INITIAL_NOTIFICATIONS.length,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const accountRef = useRef<HTMLDivElement | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), TRANSIENT_NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!accountRef.current?.contains(target)) {
        setAccountOpen(false);
      }
      if (!notificationsRef.current?.contains(target)) {
        setNotificationsOpen(false);
      }
    }

    if (accountOpen || notificationsOpen) {
      window.addEventListener("pointerdown", onPointerDown);
    }
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [accountOpen, notificationsOpen]);

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

  function toggleNotifications() {
    setNotificationsOpen((open) => !open);
    setUnreadNotifications(0);
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
        <Search size={15} aria-hidden="true" strokeWidth={1.8} />
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
          <CircleDollarSign size={15} aria-hidden="true" strokeWidth={1.8} />
          <span>KRW 기준</span>
        </span>
        <Link
          className={styles.actionButton}
          aria-label="저장한 항목 보기"
          title="저장한 항목"
          to="/mypage?tab=saved"
        >
          <Bookmark size={16} aria-hidden="true" strokeWidth={1.8} />
          <span>저장</span>
        </Link>
        <div className={styles.notifications} ref={notificationsRef}>
          <button
            className={styles.actionButtonNotice}
            type="button"
            aria-expanded={notificationsOpen}
            aria-haspopup="menu"
            aria-label={`알림 열기${unreadNotifications > 0 ? `, 새 알림 ${unreadNotifications}개` : ""}`}
            title="알림"
            data-unread={unreadNotifications > 0 ? "true" : "false"}
            onClick={toggleNotifications}
          >
            <Bell size={16} aria-hidden="true" strokeWidth={1.8} />
            <span>알림</span>
          </button>
          {notificationsOpen ? (
            <div className={styles.notificationMenu} role="menu">
              <div className={styles.menuHeader}>
                <span>알림</span>
                <span>{unreadNotifications > 0 ? `${unreadNotifications}개 신규` : "모두 확인"}</span>
              </div>
              {INITIAL_NOTIFICATIONS.map((item) => (
                <Link
                  key={item}
                  className={styles.notificationItem}
                  role="menuitem"
                  to="/mypage"
                  onClick={() => setNotificationsOpen(false)}
                >
                  {item}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
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
              <ChevronDown size={12} aria-hidden="true" strokeWidth={2} />
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
                  to="/"
                  onClick={() => setAccountOpen(false)}
                >
                  <Home size={15} aria-hidden="true" />
                  홈
                </Link>
                <Link
                  className={styles.accountItem}
                  role="menuitem"
                  to="/mypage"
                  onClick={() => setAccountOpen(false)}
                >
                  <User size={15} aria-hidden="true" />
                  마이페이지
                </Link>
                <Link
                  className={styles.accountItem}
                  role="menuitem"
                  to="/mypage?tab=portfolio"
                  onClick={() => setAccountOpen(false)}
                >
                  <BriefcaseBusiness size={15} aria-hidden="true" />
                  포트폴리오
                </Link>
                <Link
                  className={styles.accountItem}
                  role="menuitem"
                  to="/mypage?tab=saved"
                  onClick={() => setAccountOpen(false)}
                >
                  <FileText size={15} aria-hidden="true" />
                  관심 리포트
                </Link>
                <button
                  className={styles.accountItemButton}
                  type="button"
                  role="menuitem"
                  onClick={() => void handleSignOut()}
                >
                  <LogOut size={15} aria-hidden="true" />
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
