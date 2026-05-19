/**
 * Layout.tsx — Midnight Precision Design System
 * - Collapsible sidebar (256px → 64px)
 * - Top ticker marquee
 * - Header with dark/light toggle, login/user button
 * - Responsive: mobile drawer sidebar
 */
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Home, BarChart2, Newspaper, Users, FileText, BookOpen,
  User, Sun, Moon, Menu, ChevronLeft, ChevronRight, Calendar, Search,
  TrendingUp, TrendingDown, Activity, Bell,
  LogOut
} from "lucide-react";
import { useNotices } from "@/features/notices";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Admin nav remains conditional on a real Supabase-issued admin claim. Until
// that's wired we keep the entry hidden — no client-side email allowlist.

const NAV_ITEMS = [
  { path: "/", icon: Home, label: "홈", sublabel: "Dashboard" },
  { path: "/analysis", icon: BarChart2, label: "분석", sublabel: "Analysis" },
  { path: "/news", icon: Newspaper, label: "뉴스", sublabel: "News" },
  { path: "/calendar", icon: Calendar, label: "캘린더", sublabel: "Calendar" },
  { path: "/masters", icon: Users, label: "고수 따라잡기", sublabel: "Masters" },
  { path: "/reports", icon: FileText, label: "리포트", sublabel: "Reports" },
  { path: "/learn", icon: BookOpen, label: "학습", sublabel: "Learn" },
  { path: "/mypage", icon: User, label: "마이페이지", sublabel: "My Page" },
];

import { useMovers } from "@/features/movers";

function TickerBar() {
  const us = useMovers({ market: "US", limit: 10 });
  const kr = useMovers({ market: "KR", limit: 6 });
  const items = [...(us.data?.items ?? []), ...(kr.data?.items ?? [])];
  if (items.length === 0) {
    return (
      <div className="h-8 bg-card border-b border-border overflow-hidden flex items-center justify-center text-[10px] text-muted-foreground">
        시세 불러오는 중…
      </div>
    );
  }
  const doubled = [...items, ...items];
  return (
    <div className="h-8 bg-card border-b border-border overflow-hidden flex items-center">
      <div className="flex items-center gap-0 ticker-scroll whitespace-nowrap">
        {doubled.map((item, i) => {
          const up = item.change_pct >= 0;
          return (
            <span key={`${item.symbol}-${i}`} className="inline-flex items-center gap-1.5 px-4 text-xs">
              <span className="text-muted-foreground font-mono">{item.symbol}</span>
              <span className="font-mono font-medium tabular-nums">
                {item.last >= 1000 ? item.last.toLocaleString(undefined, { maximumFractionDigits: 0 }) : item.last.toFixed(2)}
              </span>
              <span className={cn("font-mono font-medium flex items-center gap-0.5 tabular-nums", up ? "text-up" : "text-down")}>
                {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {up ? "+" : ""}{item.change_pct.toFixed(2)}%
              </span>
              <span className="text-border mx-1">|</span>
            </span>
          );
        })}
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
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();

  if (!user) {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled
        className="h-8 text-xs font-medium gap-1.5 cursor-not-allowed opacity-70"
        title="Supabase 인증 연결 예정"
      >
        <User size={13} /> 로그인 (준비중)
      </Button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 h-8 px-2 rounded-lg hover:bg-accent transition-colors"
      >
        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="text-[10px] font-bold text-primary">{user.name[0]}</span>
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
            </div>
            <button
              onClick={() => { navigate("/mypage"); setOpen(false); }}
              className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
            >
              <User size={13} className="text-muted-foreground" /> 마이페이지
            </button>
            <div className="border-t border-border mt-1 pt-1">
              <button
                onClick={() => { logout(); setOpen(false); toast.info("로그아웃 완료"); }}
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

function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const [location] = useLocation();
  // Admin nav stays hidden until real auth is wired.
  const navItems = NAV_ITEMS;

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={onMobileClose} />
      )}
      <aside className={cn(
        "fixed top-0 left-0 h-full z-50 flex flex-col",
        "bg-sidebar border-r border-sidebar-border",
        "transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
        collapsed ? "w-16" : "w-64",
        "lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo */}
        <div className={cn(
          "flex items-center h-14 border-b border-sidebar-border px-3 gap-3",
          collapsed ? "justify-center" : "justify-between"
        )}>
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                <Activity size={14} className="text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-sm leading-tight text-sidebar-foreground font-['Outfit']">Finance Lab</div>
                <div className="text-[10px] text-muted-foreground leading-tight">Investing Workspace</div>
              </div>
            </Link>
          )}
          {collapsed ? (
            <Button variant="ghost" size="icon" onClick={onToggle} className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground">
              <ChevronRight size={14} />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" onClick={onToggle} className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground flex-shrink-0">
              <ChevronLeft size={14} />
            </Button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
            return (
              <Link key={item.path} href={item.path} onClick={onMobileClose}>
                <div className={cn(
                  "relative flex items-center gap-3 mx-2 my-0.5 rounded-lg transition-all duration-150",
                  collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}>
                  <item.icon size={18} className="flex-shrink-0" />
                  {!collapsed && (
                    <div className="min-w-0">
                      <div className="text-sm font-medium leading-tight">{item.label}</div>
                      <div className="text-[10px] text-muted-foreground leading-tight">{item.sublabel}</div>
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
function NotificationButton() {
  const [open, setOpen] = useState(false);
  const { data, loading } = useNotices();
  const items = data ?? [];
  const count = items.length;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 relative"
        onClick={() => setOpen(!open)}
        title="공지사항"
      >
        <Bell size={16} />
        {count > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full text-[9px] text-primary-foreground flex items-center justify-center font-bold">
            {count}
          </span>
        )}
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold">공지사항</span>
              {count > 0 && (
                <span className="text-[10px] text-muted-foreground font-mono">
                  {count}건
                </span>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  불러오는 중…
                </div>
              ) : items.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  새 공지가 없습니다
                </div>
              ) : (
                items.map((n) => {
                  const inner = (
                    <div className="flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer">
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-primary" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] font-mono uppercase text-muted-foreground">
                            {n.tag}
                          </span>
                          {n.is_pinned && (
                            <span className="text-[10px] font-mono text-primary">
                              ★
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-medium leading-tight">
                          {n.title}
                        </div>
                        {n.description && (
                          <div className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                            {n.description}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                  if (n.url) {
                    return (
                      <a key={n.id} href={n.url} target="_blank" rel="noreferrer">
                        {inner}
                      </a>
                    );
                  }
                  return <div key={n.id}>{inner}</div>;
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Header ────────────────────────────────────────────────────
function Header({ onMobileMenuOpen }: { onMobileMenuOpen: () => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [location, navigate] = useLocation();

  const currentPage = NAV_ITEMS.find(item =>
    item.path === location || (item.path !== "/" && location.startsWith(item.path))
  );

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    const isLower = /^[a-z]/.test(q);
    if (isLower) {
      // looks like a master slug (e.g. "buffett", "klarman")
      navigate(`/masters/${q}`);
    } else {
      // ticker-like — uppercase and route to stock detail
      const symbol = q.replace(/\s+/g, "").toUpperCase();
      navigate(`/stocks/${encodeURIComponent(symbol)}`);
    }
    setSearchQuery("");
  };

  return (
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-4 gap-3 sticky top-0 z-30">
      <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8" onClick={onMobileMenuOpen}>
        <Menu size={18} />
      </Button>

      <div className="hidden sm:flex items-center gap-2 min-w-0">
        {currentPage && (
          <>
            <span className="text-sm font-semibold text-foreground font-['Outfit']">{currentPage.label}</span>
            <span className="text-xs text-muted-foreground">{currentPage.sublabel}</span>
          </>
        )}
      </div>

      <form onSubmit={submitSearch} className="flex-1 max-w-md mx-auto">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="종목(AAPL) 또는 거장(buffett) 검색 후 Enter"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-8 pr-3 text-sm bg-muted/50 border border-border rounded-lg
              focus:outline-none focus:ring-1 focus:ring-primary focus:bg-background
              placeholder:text-muted-foreground transition-all duration-150"
          />
        </div>
      </form>

      <div className="flex items-center gap-1">
        <ThemeToggle />
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
          const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
          return (
            <Link key={item.path} href={item.path} className="flex-1">
              <div className={cn(
                "flex flex-col items-center justify-center h-full gap-1 transition-all duration-150",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                <item.icon size={20} className={cn("transition-transform duration-150", isActive && "scale-110")} />
                <span className={cn("text-[10px] font-medium", isActive && "font-semibold")}>{item.label}</span>
                {isActive && <span className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-t-full" />}
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
      <div className={cn(
        "flex flex-col min-h-screen transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
        "lg:ml-64",
        collapsed && "lg:ml-16"
      )}>
        <TickerBar />
        <Header onMobileMenuOpen={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6">
          {children}
        </main>
      </div>
      <MobileBottomBar />
    </div>
  );
}
