/**
 * WatchlistContext — 관심종목 상태.
 *
 * 인증된 사용자: 서버(watchlist_items 테이블) 동기화. mount 시 1회 fetch.
 *   add/remove 는 optimistic update 후 서버 호출, 실패 시 롤백.
 *   서버에서 instrument를 찾지 못하면(`instrument_not_found`) 로컬에만 유지.
 * 비로그인: localStorage 동작 유지.
 */
import { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from "react";
import { watchlistsService } from "@/features/watchlists";
import { useAuth } from "@/contexts/AuthContext";

export interface WatchItem {
  ticker: string;
  name: string;
  exchange: string;
  price: number;
  changePct: number;
  sector: string;
  addedAt: string;
}

interface WatchlistContextValue {
  watchlist: WatchItem[];
  isWatched: (ticker: string) => boolean;
  addToWatchlist: (item: Omit<WatchItem, "addedAt">) => void;
  removeFromWatchlist: (ticker: string) => void;
  toggleWatchlist: (item: Omit<WatchItem, "addedAt">) => boolean;
  clearWatchlist: () => void;
}

const WatchlistContext = createContext<WatchlistContextValue | null>(null);

const STORAGE_KEY = "financelab_watchlist";

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [watchlist, setWatchlist] = useState<WatchItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist)); } catch { /* ignore */ }
  }, [watchlist]);

  // 로그인 시 서버에서 watchlist hydrate (server-side items로 교체).
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!user) { hydratedRef.current = false; return; }
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    (async () => {
      try {
        const wl = await watchlistsService.getMine();
        if (!wl.items.length) return;
        // 서버 아이템을 우선시, 로컬-only 추가분은 유지(merge by ticker).
        setWatchlist((prev) => {
          const serverTickers = new Set(wl.items.map((i) => i.symbol));
          const localOnly = prev.filter((p) => !serverTickers.has(p.ticker));
          const fromServer: WatchItem[] = wl.items.map((i) => ({
            ticker: i.symbol,
            name: i.name,
            exchange: i.exchange,
            price: i.last_price ?? 0,
            changePct: 0,
            sector: "",
            addedAt: new Date().toISOString(),
          }));
          return [...fromServer, ...localOnly];
        });
      } catch {
        // 실패 시 로컬 상태 유지.
      }
    })();
  }, [user]);

  const isWatched = useCallback((ticker: string) => {
    return watchlist.some((w) => w.ticker === ticker);
  }, [watchlist]);

  const addToWatchlist = useCallback((item: Omit<WatchItem, "addedAt">) => {
    setWatchlist((prev) => {
      if (prev.some((w) => w.ticker === item.ticker)) return prev;
      return [...prev, { ...item, addedAt: new Date().toISOString() }];
    });
    if (user) {
      watchlistsService.addItem(item.ticker, item.exchange).catch(() => {
        // 서버 실패(예: instrument_not_found) — 로컬만 유지.
      });
    }
  }, [user]);

  const removeFromWatchlist = useCallback((ticker: string) => {
    const prev = watchlist.find((w) => w.ticker === ticker);
    setWatchlist((cur) => cur.filter((w) => w.ticker !== ticker));
    if (user && prev) {
      watchlistsService.removeItem(ticker, prev.exchange).catch(() => {
        // 롤백
        setWatchlist((cur) => {
          if (cur.some((w) => w.ticker === ticker)) return cur;
          return [...cur, { ...prev }];
        });
      });
    }
  }, [user, watchlist]);

  const toggleWatchlist = useCallback((item: Omit<WatchItem, "addedAt">): boolean => {
    const already = watchlist.some((w) => w.ticker === item.ticker);
    if (already) {
      removeFromWatchlist(item.ticker);
      return false;
    }
    addToWatchlist(item);
    return true;
  }, [watchlist, addToWatchlist, removeFromWatchlist]);

  const clearWatchlist = useCallback(() => {
    setWatchlist([]);
  }, []);

  return (
    <WatchlistContext.Provider value={{
      watchlist,
      isWatched,
      addToWatchlist,
      removeFromWatchlist,
      toggleWatchlist,
      clearWatchlist,
    }}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  const ctx = useContext(WatchlistContext);
  if (!ctx) throw new Error("useWatchlist must be used within WatchlistProvider");
  return ctx;
}
