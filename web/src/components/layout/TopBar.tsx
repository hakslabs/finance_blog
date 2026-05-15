import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  Bell,
  Bookmark,
  BriefcaseBusiness,
  ChevronDown,
  CircleDollarSign,
  FileText,
  Home,
  Languages,
  LogOut,
  Search,
  User,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { MASTERS } from "../../fixtures/masters";
import { REPORTS } from "../../fixtures/reports";
import { STOCK_LIST } from "../../fixtures/stocks";
import { useAuth } from "../../lib/auth-state";
import { getUserDisplayName, getUserEmail, getUserInitial, isAdminUser } from "../../lib/auth-user";
import { useCurrency } from "../../lib/currency";
import { SHELL_LABELS, useLanguage } from "../../lib/language";
import {
  getCurrentNavItem,
  getVisibleNavItems,
  primaryNavItems,
  utilityNavItems,
  type NavItem,
} from "./navigation";
import styles from "./TopBar.module.css";

const TRANSIENT_NOTICE_MS = 2400;
const NOTIF_READ_STORAGE_KEY = "finance-lab:notif:read-at";
const INITIAL_NOTIFICATIONS: { id: string; label: string; at: string }[] = [
  { id: "aapl-dividend", label: "AAPL 배당락 전 포지션 점검", at: "2026-05-15T06:30:00Z" },
  { id: "nvda-thesis", label: "NVDA Thesis 조건 검토", at: "2026-05-15T07:15:00Z" },
];

function readNotifReadAt(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(NOTIF_READ_STORAGE_KEY);
  if (!raw) return 0;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function countUnread(readAtMs: number): number {
  return INITIAL_NOTIFICATIONS.filter(
    (item) => new Date(item.at).getTime() > readAtMs,
  ).length;
}

const SEARCH_GROUPS = {
  menu: "메뉴",
  stock: "종목",
  report: "리포트",
  master: "고수",
} as const;
type SearchGroup = (typeof SEARCH_GROUPS)[keyof typeof SEARCH_GROUPS];

type SearchResult = {
  id: string;
  group: SearchGroup;
  label: string;
  meta: string;
  to: string;
};

function navSearchItems(items: NavItem[]): SearchResult[] {
  return items.map((item) => ({
    id: `nav-${item.path}`,
    group: SEARCH_GROUPS.menu,
    label: item.label,
    meta: item.labelEn,
    to: item.path,
  }));
}

const STOCK_SEARCH_ITEMS: SearchResult[] = STOCK_LIST.map((stock) => ({
  id: `stock-${stock.id}`,
  group: SEARCH_GROUPS.stock,
  label: stock.symbol,
  meta: `${stock.name} · ${stock.exchange}`,
  to: `/stocks/${encodeURIComponent(stock.symbol)}`,
}));

const REPORT_SEARCH_ITEMS: SearchResult[] = REPORTS.slice(0, 8).map((report) => ({
  id: `report-${report.id}`,
  group: SEARCH_GROUPS.report,
  label: report.title,
  meta: `${report.source} · ${report.category}`,
  to: `/reports/${encodeURIComponent(report.id)}`,
}));

const MASTER_SEARCH_ITEMS: SearchResult[] = MASTERS.map((master) => ({
  id: `master-${master.id}`,
  group: SEARCH_GROUPS.master,
  label: master.name,
  meta: `${master.firm} · ${master.style}`,
  to: `/masters/${encodeURIComponent(master.id)}`,
}));

const NON_NAV_SEARCH_ITEMS = [
  ...STOCK_SEARCH_ITEMS,
  ...REPORT_SEARCH_ITEMS,
  ...MASTER_SEARCH_ITEMS,
];

function getSearchResults(query: string, isAdmin: boolean): SearchResult[] {
  const normalized = query.trim().toLowerCase();
  const searchItems = [
    ...navSearchItems([
      ...primaryNavItems,
      ...getVisibleNavItems(utilityNavItems, isAdmin),
    ]),
    ...NON_NAV_SEARCH_ITEMS,
  ];
  const base = normalized
    ? searchItems.filter((item) =>
        `${item.group} ${item.label} ${item.meta}`.toLowerCase().includes(normalized),
      )
    : searchItems.filter((item) => item.group === SEARCH_GROUPS.menu).slice(0, 7);
  return base.slice(0, 8);
}

export function TopBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const current = getCurrentNavItem(pathname);
  const auth = useAuth();
  const isAdmin = auth.status === "signed-in" && isAdminUser(auth.user);
  const { currency, toggle: toggleCurrency } = useCurrency();
  const { lang, toggle: toggleLang, pick } = useLanguage();
  const [accountOpen, setAccountOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifReadAt, setNotifReadAt] = useState<number>(() => readNotifReadAt());
  const unreadNotifications = useMemo(() => countUnread(notifReadAt), [notifReadAt]);
  const [notice, setNotice] = useState<string | null>(null);
  const accountRef = useRef<HTMLDivElement | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLFormElement | null>(null);
  const searchResults = useMemo(() => getSearchResults(searchQuery, isAdmin), [isAdmin, searchQuery]);

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
      if (!searchRef.current?.contains(target)) {
        setSearchOpen(false);
      }
    }

    if (accountOpen || notificationsOpen || searchOpen) {
      window.addEventListener("pointerdown", onPointerDown);
    }
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [accountOpen, notificationsOpen, searchOpen]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = searchResults[0];
    if (result) {
      navigate(result.to);
      setSearchOpen(false);
      return;
    }
    navigate("/stocks");
    setSearchOpen(false);
  }

  function toggleNotifications() {
    setNotificationsOpen((open) => !open);
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

  function handleMarkAllRead() {
    const now = Date.now();
    setNotifReadAt(now);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(NOTIF_READ_STORAGE_KEY, String(now));
    }
  }

  return (
    <header className={styles.bar}>
      <div className={styles.title}>
        <span className={styles.titleKo}>
          {lang === "en" ? current.labelEn : current.label}
        </span>
        <span className={styles.titleEn} translate="no">
          {lang === "en" ? current.label : current.labelEn}
        </span>
      </div>

      <form className={styles.search} onSubmit={handleSearch} ref={searchRef}>
        <span className="sr-only">메뉴, 종목, 리포트, 고수 검색</span>
        <Search size={15} aria-hidden="true" strokeWidth={1.8} />
        <input
          type="search"
          name="global-search"
          placeholder="메뉴 / 종목 / 리포트 / 고수 검색…"
          autoComplete="off"
          spellCheck={false}
          className={styles.searchInput}
          value={searchQuery}
          onFocus={() => setSearchOpen(true)}
          onChange={(event) => {
            setSearchQuery(event.target.value);
            setSearchOpen(true);
          }}
        />
        {searchOpen ? (
          <div className={styles.searchMenu} role="listbox" aria-label="검색 결과">
            {searchResults.map((result) => (
              <button
                key={result.id}
                type="button"
                className={styles.searchResult}
                onClick={() => {
                  navigate(result.to);
                  setSearchOpen(false);
                }}
              >
                <span className={styles.searchGroup}>{result.group}</span>
                <span className={styles.searchLabel}>{result.label}</span>
                <span className={styles.searchMeta}>{result.meta}</span>
              </button>
            ))}
            {searchResults.length === 0 ? (
              <div className={styles.searchEmpty}>검색 결과가 없습니다.</div>
            ) : null}
          </div>
        ) : null}
      </form>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.chipButton}
          translate="no"
          aria-label={`${pick(SHELL_LABELS.currencyToggleAria)} (${currency})`}
          onClick={toggleCurrency}
        >
          <CircleDollarSign size={15} aria-hidden="true" strokeWidth={1.8} />
          <span>{currency}</span>
        </button>
        <button
          type="button"
          className={styles.chipButton}
          translate="no"
          aria-label={`${pick(SHELL_LABELS.langToggleAria)} (${lang})`}
          onClick={toggleLang}
        >
          <Languages size={15} aria-hidden="true" strokeWidth={1.8} />
          <span>{lang === "ko" ? "한" : "EN"}</span>
        </button>
        <Link
          className={styles.actionButton}
          aria-label={pick(SHELL_LABELS.savedItems)}
          title={pick(SHELL_LABELS.savedItems)}
          to="/mypage?tab=saved"
        >
          <Bookmark size={16} aria-hidden="true" strokeWidth={1.8} />
          <span>{pick(SHELL_LABELS.savedItems)}</span>
        </Link>
        <div className={styles.notifications} ref={notificationsRef}>
          <button
            className={styles.actionButtonNotice}
            type="button"
            aria-expanded={notificationsOpen}
            aria-haspopup="menu"
            aria-label={`${pick(SHELL_LABELS.notifications)}${unreadNotifications > 0 ? ` (${unreadNotifications})` : ""}`}
            title={pick(SHELL_LABELS.notifications)}
            data-unread={unreadNotifications > 0 ? "true" : "false"}
            onClick={toggleNotifications}
          >
            <Bell size={16} aria-hidden="true" strokeWidth={1.8} />
            <span>{pick(SHELL_LABELS.notifications)}</span>
          </button>
          {notificationsOpen ? (
            <div className={styles.notificationMenu} role="menu">
              <div className={styles.menuHeader}>
                <span>{pick(SHELL_LABELS.notificationsHeader)}</span>
                <button
                  type="button"
                  className={styles.markAllButton}
                  disabled={unreadNotifications === 0}
                  onClick={handleMarkAllRead}
                >
                  {pick(SHELL_LABELS.markAllRead)}
                </button>
              </div>
              {INITIAL_NOTIFICATIONS.map((item) => (
                <Link
                  key={item.id}
                  className={styles.notificationItem}
                  role="menuitem"
                  to="/mypage"
                  onClick={() => setNotificationsOpen(false)}
                >
                  {item.label}
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
              aria-label={pick(SHELL_LABELS.account)}
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
                  {pick(SHELL_LABELS.home)}
                </Link>
                <Link
                  className={styles.accountItem}
                  role="menuitem"
                  to="/mypage"
                  onClick={() => setAccountOpen(false)}
                >
                  <User size={15} aria-hidden="true" />
                  {pick(SHELL_LABELS.mypage)}
                </Link>
                <Link
                  className={styles.accountItem}
                  role="menuitem"
                  to="/mypage?tab=portfolio"
                  onClick={() => setAccountOpen(false)}
                >
                  <BriefcaseBusiness size={15} aria-hidden="true" />
                  {pick(SHELL_LABELS.portfolio)}
                </Link>
                <Link
                  className={styles.accountItem}
                  role="menuitem"
                  to="/mypage?tab=saved"
                  onClick={() => setAccountOpen(false)}
                >
                  <FileText size={15} aria-hidden="true" />
                  {pick(SHELL_LABELS.savedReports)}
                </Link>
                <button
                  className={styles.accountItemButton}
                  type="button"
                  role="menuitem"
                  onClick={() => void handleSignOut()}
                >
                  <LogOut size={15} aria-hidden="true" />
                  {pick(SHELL_LABELS.signOut)}
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
            {auth.status === "loading"
              ? pick(SHELL_LABELS.signingIn)
              : pick(SHELL_LABELS.signIn)}
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
