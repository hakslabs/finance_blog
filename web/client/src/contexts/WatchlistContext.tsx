/**
 * WatchlistContext
 * - localStorage 기반 관심종목 CRUD
 * - 로그인 여부와 무관하게 브라우저에 저장
 * - 향후 백엔드 연동 시 이 Context만 교체하면 됨
 */
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

export interface WatchItem {
  ticker: string;
  name: string;
  exchange: string;
  price: number;
  changePct: number;
  sector: string;
  addedAt: string; // ISO string
}

interface WatchlistContextValue {
  watchlist: WatchItem[];
  isWatched: (ticker: string) => boolean;
  addToWatchlist: (item: Omit<WatchItem, "addedAt">) => void;
  removeFromWatchlist: (ticker: string) => void;
  toggleWatchlist: (item: Omit<WatchItem, "addedAt">) => boolean; // returns new state
  clearWatchlist: () => void;
}

const WatchlistContext = createContext<WatchlistContextValue | null>(null);

const STORAGE_KEY = "financelab_watchlist";

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [watchlist, setWatchlist] = useState<WatchItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // localStorage 동기화
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist));
    } catch {
      // storage full or private mode
    }
  }, [watchlist]);

  const isWatched = useCallback((ticker: string) => {
    return watchlist.some((w) => w.ticker === ticker);
  }, [watchlist]);

  const addToWatchlist = useCallback((item: Omit<WatchItem, "addedAt">) => {
    setWatchlist((prev) => {
      if (prev.some((w) => w.ticker === item.ticker)) return prev;
      return [...prev, { ...item, addedAt: new Date().toISOString() }];
    });
  }, []);

  const removeFromWatchlist = useCallback((ticker: string) => {
    setWatchlist((prev) => prev.filter((w) => w.ticker !== ticker));
  }, []);

  const toggleWatchlist = useCallback((item: Omit<WatchItem, "addedAt">): boolean => {
    let added = false;
    setWatchlist((prev) => {
      if (prev.some((w) => w.ticker === item.ticker)) {
        added = false;
        return prev.filter((w) => w.ticker !== item.ticker);
      } else {
        added = true;
        return [...prev, { ...item, addedAt: new Date().toISOString() }];
      }
    });
    return added;
  }, []);

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
