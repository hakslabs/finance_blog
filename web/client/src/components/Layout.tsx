/**
 * Layout.tsx — Midnight Precision Design System
 * - Collapsible sidebar (256px → 64px)
 * - Top ticker marquee
 * - Header with dark/light toggle, login/user button
 * - Responsive: mobile drawer sidebar
 */
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "wouter";
import { apiGet } from "@/lib/http";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Home,
  BarChart2,
  Newspaper,
  Users,
  FileText,
  BookOpen,
  User,
  Sun,
  Moon,
  Menu,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Search,
  TrendingUp,
  TrendingDown,
  Activity,
  Bell,
  Shield,
  LogOut,
  Settings,
  Bookmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const ADMIN_EMAILS = ["admin@financelab.pro", "superadmin@financelab.pro"];

const NAV_ITEMS = [
  { path: "/", icon: Home, label: "홈", sublabel: "Dashboard" },
  { path: "/analysis", icon: BarChart2, label: "분석", sublabel: "Analysis" },
  { path: "/news", icon: Newspaper, label: "뉴스", sublabel: "News" },
  { path: "/calendar", icon: Calendar, label: "캘린더", sublabel: "Calendar" },
  {
    path: "/masters",
    icon: Users,
    label: "고수 따라잡기",
    sublabel: "Masters",
  },
  { path: "/reports", icon: FileText, label: "리포트", sublabel: "Reports" },
  { path: "/learn", icon: BookOpen, label: "학습", sublabel: "Learn" },
  { path: "/mypage", icon: User, label: "마이페이지", sublabel: "My Page" },
];

const TICKER_DATA = [
  { symbol: "KOSPI", value: "2,684.32", change: "+0.69%", up: true },
  { symbol: "S&P 500", value: "5,812.44", change: "+0.38%", up: true },
  { symbol: "NASDAQ", value: "18,024.1", change: "+0.72%", up: true },
  { symbol: "USD/KRW", value: "1,387.20", change: "-0.22%", up: false },
  { symbol: "WTI", value: "$71.84", change: "+0.59%", up: true },
  { symbol: "GOLD", value: "$2,318.4", change: "+0.41%", up: true },
  { symbol: "BTC", value: "$61,240", change: "-1.32%", up: false },
  { symbol: "VIX", value: "14.2", change: "-2.8%", up: false },
  { symbol: "US 10Y", value: "4.42%", change: "+3bp", up: true },
  { symbol: "NVDA", value: "912.18", change: "+3.42%", up: true },
  { symbol: "AAPL", value: "184.32", change: "+1.24%", up: true },
  { symbol: "TSLA", value: "218.40", change: "-2.10%", up: false },
  { symbol: "삼성전자", value: "78,400", change: "+0.51%", up: true },
];

function TickerBar() {
  const doubled = [...TICKER_DATA, ...TICKER_DATA];
  return (
    <div className="h-8 bg-card border-b border-border overflow-hidden flex items-center">
      <div className="flex items-center gap-0 ticker-scroll whitespace-nowrap">
        {doubled.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 px-4 text-xs"
          >
            <span className="text-muted-foreground font-mono">
              {item.symbol}
            </span>
            <span className="font-mono font-medium">{item.value}</span>
            <span
              className={cn(
                "font-mono font-medium flex items-center gap-0.5",
                item.up ? "text-up" : "text-down",
              )}
            >
              {item.up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {item.change}
            </span>
            <span className="text-border mx-1">|</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-8 w-8 rounded-full hover:bg-accent transition-all duration-200"
      title={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
    >
      {theme === "dark" ? (
        <Sun size={16} className="text-gold" />
      ) : (
        <Moon size={16} className="text-sky" />
      )}
    </Button>
  );
}

// ── User Menu ─────────────────────────────────────────────────
function UserMenu() {
  const { user, login, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();

  if (!user) {
    return (
      <div className="relative">
        <Button
          size="sm"
          className="h-8 text-xs font-medium gap-1.5"
          onClick={() => setOpen(!open)}
        >
          <User size={13} /> 로그인
        </Button>
        {open && (
          <div className="absolute right-0 top-10 w-52 bg-card border border-border rounded-xl shadow-xl z-50 p-2">
            <p className="text-xs text-muted-foreground px-3 py-2">
              Google 계정으로 로그인
            </p>
            <button
              onClick={() => {
                login("user@example.com");
                setOpen(false);
                toast.success("로그인 완료");
              }}
              className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-muted transition-colors"
            >
              일반 사용자로 로그인 (데모)
            </button>
            <button
              onClick={() => {
                login("admin@financelab.pro");
                setOpen(false);
                toast.success("관리자 로그인 완료");
              }}
              className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-muted transition-colors text-primary"
            >
              어드민으로 로그인 (데모)
            </button>
          </div>
        )}
      </div>
    );
  }

  const isAdmin = ADMIN_EMAILS.includes(user.email);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 h-8 px-2 rounded-lg hover:bg-accent transition-colors"
      >
        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="text-[10px] font-bold text-primary">
            {user.name[0]}
          </span>
        </div>
        <span className="text-xs font-medium hidden sm:block">{user.name}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 w-52 bg-card border border-border rounded-xl shadow-xl z-50 p-2">
            <div className="px-3 py-2 border-b border-border mb-1">
              <div className="text-sm font-semibold">{user.name}</div>
              <div className="text-xs text-muted-foreground">{user.email}</div>
              {isAdmin && (
                <div className="flex items-center gap-1 mt-1 text-[10px] text-primary">
                  <Shield size={9} /> 관리자
                </div>
              )}
            </div>
            <button
              onClick={() => {
                navigate("/mypage");
                setOpen(false);
              }}
              className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
            >
              <User size={13} className="text-muted-foreground" /> 마이페이지
            </button>
            {isAdmin && (
              <button
                onClick={() => {
                  navigate("/admin");
                  setOpen(false);
                }}
                className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-muted transition-colors flex items-center gap-2 text-primary"
              >
                <Shield size={13} /> 어드민
              </button>
            )}
            <div className="border-t border-border mt-1 pt-1">
              <button
                onClick={() => {
                  logout();
                  setOpen(false);
                  toast.info("로그아웃 완료");
                }}
                className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-muted transition-colors flex items-center gap-2 text-muted-foreground"
              >
                <LogOut size={13} /> 로그아웃
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────
interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const isAdmin = user && ADMIN_EMAILS.includes(user.email);

  const navItems = [
    ...NAV_ITEMS,
    ...(isAdmin
      ? [{ path: "/admin", icon: Shield, label: "어드민", sublabel: "Admin" }]
      : []),
  ];

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full z-50 flex flex-col",
          "bg-sidebar border-r border-sidebar-border",
          "transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
          collapsed ? "w-16" : "w-64",
          "lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "flex items-center h-14 border-b border-sidebar-border px-3 gap-3",
            collapsed ? "justify-center" : "justify-between",
          )}
        >
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                <Activity size={14} className="text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-sm leading-tight text-sidebar-foreground font-['Outfit']">
                  FinanceLab
                </div>
                <div className="text-[10px] text-muted-foreground leading-tight">
                  Pro Workspace
                </div>
              </div>
            </Link>
          )}
          {collapsed ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground"
            >
              <ChevronRight size={14} />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground flex-shrink-0"
            >
              <ChevronLeft size={14} />
            </Button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const isActive =
              location === item.path ||
              (item.path !== "/" && location.startsWith(item.path));
            return (
              <Link key={item.path} href={item.path} onClick={onMobileClose}>
                <div
                  className={cn(
                    "relative flex items-center gap-3 mx-2 my-0.5 rounded-lg transition-all duration-150",
                    collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  )}
                >
                  <item.icon size={18} className="flex-shrink-0" />
                  {!collapsed && (
                    <div className="min-w-0">
                      <div className="text-sm font-medium leading-tight">
                        {item.label}
                      </div>
                      <div className="text-[10px] text-muted-foreground leading-tight">
                        {item.sublabel}
                      </div>
                    </div>
                  )}
                  {collapsed && isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary rounded-r-full" />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {!collapsed && (
          <div className="p-3 border-t border-sidebar-border">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-muted-foreground">테마</span>
              <ThemeToggle />
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

// ── Notification Button ──────────────────────────────────────
const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    type: "alert",
    title: "NVDA 목표가 도달",
    body: "NVDA가 설정한 목표가 $950에 도달했습니다.",
    time: "5분 전",
    read: false,
  },
  {
    id: 2,
    type: "report",
    title: "새 리포트 등록",
    body: "버크셔 Q1 2025 13F 보고서가 등록되었습니다.",
    time: "1시간 전",
    read: false,
  },
  {
    id: 3,
    type: "master",
    title: "워런 버핏 포트폴리오 변화",
    body: "AAPL 비중 추가 축소 감지 (Q1 2025)",
    time: "3시간 전",
    read: true,
  },
  {
    id: 4,
    type: "market",
    title: "한국장 개장",
    body: "KOSPI 오전 9시 정규장 개장",
    time: "오전 9:00",
    read: true,
  },
];

function NotificationButton() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success("모든 알림을 읽음 처리했습니다");
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 relative"
        onClick={() => setOpen(!open)}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-destructive rounded-full text-[9px] text-white flex items-center justify-center font-bold">
            {unreadCount}
          </span>
        )}
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">알림</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] bg-destructive text-white rounded-full px-1.5 py-0.5 font-bold">
                    {unreadCount}
                  </span>
                )}
              </div>
              <button
                onClick={markAllRead}
                className="text-xs text-primary hover:underline"
              >
                모두 읽음
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  알림이 없습니다
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() =>
                      setNotifications((prev) =>
                        prev.map((x) =>
                          x.id === n.id ? { ...x, read: true } : x,
                        ),
                      )
                    }
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-0 cursor-pointer transition-colors hover:bg-muted/30",
                      !n.read && "bg-primary/5",
                    )}
                  >
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                        n.type === "alert"
                          ? "bg-down"
                          : n.type === "report"
                            ? "bg-primary"
                            : n.type === "master"
                              ? "bg-gold"
                              : "bg-up",
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div
                        className={cn(
                          "text-sm font-medium leading-tight",
                          !n.read && "text-foreground",
                          n.read && "text-muted-foreground",
                        )}
                      >
                        {n.title}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 leading-snug">
                        {n.body}
                      </div>
                      <div className="text-[10px] text-muted-foreground/60 mt-1">
                        {n.time}
                      </div>
                    </div>
                    {!n.read && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="px-4 py-2.5 border-t border-border">
              <button
                onClick={() => {
                  setOpen(false);
                  toast.info(
                    "마이페이지 > 알람 탭에서 전체 알림을 관리할 수 있습니다",
                  );
                }}
                className="w-full text-xs text-center text-primary hover:underline"
              >
                전체 알림 보기 →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Header ────────────────────────────────────────────────────
type SearchResults = {
  query: string;
  symbols: {
    symbol: string;
    name: string;
    exchange?: string | null;
    country_code?: string | null;
    asset_type?: string | null;
  }[];
  masters: {
    slug: string;
    name: string;
    firm?: string | null;
    country_code?: string | null;
  }[];
  reports: {
    id: string;
    title: string;
    source: string;
    category?: string | null;
    published_at?: string | null;
  }[];
};

// Quick-access bookmark button shown in the header when the user is
// signed in. Deep-links to MyPage's bookmarks tab via ?tab=bookmarks
// (handled in pages/MyPage.tsx).
function BookmarkHeaderButton() {
  return (
    <Link href="/mypage?tab=bookmarks">
      <Button variant="ghost" size="icon" className="h-8 w-8" title="북마크">
        <Bookmark size={16} />
      </Button>
    </Link>
  );
}

function Header({ onMobileMenuOpen }: { onMobileMenuOpen: () => void }) {
  const { user: authUser } = useAuth();
  const isLoggedIn = !!authUser;
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [location, navigate] = useLocation();
  const inputBoxRef = useRef<HTMLDivElement | null>(null);

  const allNavItems = [
    ...NAV_ITEMS,
    { path: "/admin", icon: Shield, label: "어드민", sublabel: "Admin" },
  ];
  const currentPage = allNavItems.find(
    (item) =>
      item.path === location ||
      (item.path !== "/" && location.startsWith(item.path)),
  );

  // Debounced search against /v1/search. We also stamp the request with
  // a sequence id and discard responses that arrive after a newer
  // keystroke — that's the real source of jank when a slow response
  // for "S" lands after the user has typed "SK하이".
  const searchSeq = useRef(0);
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setResults(null);
      setLoading(false);
      return;
    }
    // Single-char queries explode the universe filter and rarely help;
    // wait until the user has typed something more specific.
    if (q.length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const my = ++searchSeq.current;
    const t = setTimeout(async () => {
      try {
        const data = await apiGet<SearchResults>(
          `/search?q=${encodeURIComponent(q)}&limit=6`,
        );
        if (my === searchSeq.current) setResults(data);
      } catch {
        if (my === searchSeq.current)
          setResults({ query: q, symbols: [], masters: [], reports: [] });
      } finally {
        if (my === searchSeq.current) setLoading(false);
      }
    }, 180);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Close dropdown when route changes (e.g. user clicks a result)
  useEffect(() => {
    setOpen(false);
  }, [location]);

  // Outside-click + Esc close
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!inputBoxRef.current) return;
      if (!inputBoxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Keep the dropdown anchored to the input even when scrolling/resizing
  useEffect(() => {
    if (!open) return;
    const update = () => {
      if (inputBoxRef.current)
        setAnchorRect(inputBoxRef.current.getBoundingClientRect());
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  const totalHits =
    (results?.symbols.length ?? 0) +
    (results?.masters.length ?? 0) +
    (results?.reports.length ?? 0);

  const go = (path: string) => {
    setSearchQuery("");
    setOpen(false);
    navigate(path);
  };

  return (
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-4 gap-3 sticky top-0 z-30">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden h-8 w-8"
        onClick={onMobileMenuOpen}
      >
        <Menu size={18} />
      </Button>

      <div className="hidden sm:flex items-center gap-2 min-w-0">
        {currentPage && (
          <>
            <span className="text-sm font-semibold text-foreground font-['Outfit']">
              {currentPage.label}
            </span>
            <span className="text-xs text-muted-foreground">
              {currentPage.sublabel}
            </span>
          </>
        )}
      </div>

      <div className="flex-1 max-w-md mx-auto">
        <div ref={inputBoxRef} className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            placeholder="종목 / 리포트 / 고수 검색…"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => searchQuery && setOpen(true)}
            className="w-full h-8 pl-8 pr-3 text-sm bg-muted/50 border border-border rounded-lg
              focus:outline-none focus:ring-1 focus:ring-primary focus:bg-background
              placeholder:text-muted-foreground transition-all duration-150"
          />
          {open &&
            searchQuery.trim() &&
            anchorRect &&
            createPortal(
              <div
                className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
                style={{
                  position: "fixed",
                  top: anchorRect.bottom + 6,
                  left: anchorRect.left,
                  width: anchorRect.width,
                  zIndex: 60,
                }}
              >
                {loading && (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    검색 중…
                  </div>
                )}
                {!loading && results && totalHits === 0 && (
                  <div className="px-3 py-3 text-xs text-muted-foreground">
                    "{results.query}"에 대한 결과가 없어요
                  </div>
                )}
                {!loading && results && results.symbols.length > 0 && (
                  <div>
                    <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                      종목
                    </div>
                    {results.symbols.map((s) => (
                      <button
                        key={s.symbol}
                        onClick={() => go(`/stocks/${s.symbol}`)}
                        className="w-full flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-muted text-left"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-xs font-bold">
                            {s.symbol}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {s.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {s.exchange ?? s.country_code ?? ""}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {!loading && results && results.masters.length > 0 && (
                  <div className="border-t border-border">
                    <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                      고수
                    </div>
                    {results.masters.map((m) => (
                      <button
                        key={m.slug}
                        onClick={() => go(`/masters/${m.slug}`)}
                        className="w-full flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-muted text-left"
                      >
                        <span className="text-xs font-medium truncate">
                          {m.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0 truncate">
                          {m.firm ?? ""}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {!loading && results && results.reports.length > 0 && (
                  <div className="border-t border-border">
                    <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                      리포트
                    </div>
                    {results.reports.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => go(`/reports`)}
                        className="w-full flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-muted text-left"
                      >
                        <span className="text-xs truncate">{r.title}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {r.source}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>,
              document.body,
            )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <ThemeToggle />
        {/* When signed in, slot the bookmark shortcut into the place
            the dark-mode toggle used to occupy (just left of the bell). */}
        {isLoggedIn && <BookmarkHeaderButton />}
        <NotificationButton />
        <UserMenu />
      </div>
    </header>
  );
}

// ── Mobile Bottom Tab Bar ────────────────────────────────────
const MOBILE_TABS = [
  { path: "/", icon: Home, label: "홈" },
  { path: "/analysis", icon: BarChart2, label: "분석" },
  { path: "/news", icon: Newspaper, label: "뉴스" },
  { path: "/masters", icon: Users, label: "고수" },
  { path: "/mypage", icon: User, label: "마이" },
];

function MobileBottomBar() {
  const [location] = useLocation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-card/95 backdrop-blur-md border-t border-border safe-area-bottom">
      <div className="flex items-stretch h-16">
        {MOBILE_TABS.map((item) => {
          const isActive =
            location === item.path ||
            (item.path !== "/" && location.startsWith(item.path));
          return (
            <Link key={item.path} href={item.path} className="flex-1">
              <div
                className={cn(
                  "flex flex-col items-center justify-center h-full gap-1 transition-all duration-150",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                <item.icon
                  size={20}
                  className={cn(
                    "transition-transform duration-150",
                    isActive && "scale-110",
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    isActive && "font-semibold",
                  )}
                >
                  {item.label}
                </span>
                {isActive && (
                  <span className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-t-full" />
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// ── Main Layout ───────────────────────────────────────────────
export default function Layout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div
        className={cn(
          "flex flex-col min-h-screen transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
          "lg:ml-64",
          collapsed && "lg:ml-16",
        )}
      >
        <TickerBar />
        <Header onMobileMenuOpen={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6">{children}</main>
      </div>
      <MobileBottomBar />
    </div>
  );
}
