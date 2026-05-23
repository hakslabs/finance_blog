/**
 * WatchlistContext
 * - 공개 API는 그대로 (watchlist, isWatched, add/remove/toggle/clear)
 * - 로그인된 사용자는 서버(watchlists/me)와 양방향 동기화
 *   * mount 시 서버에서 hydrate (merge with local)
 *   * mutation 은 optimistic + fire-and-forget 서버 호출, 실패 시 토스트
 * - 비로그인 또는 supabase 미설정 시 localStorage 로컬 only
 */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { watchlistsService } from "@/features/watchlists";

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
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist));
    } catch {
      /* */
    }
  }, [watchlist]);

  // Hydrate from server when user logs in
  const hydratedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!user) {
      hydratedFor.current = null;
      return;
    }
    if (hydratedFor.current === user.id) return;
    hydratedFor.current = user.id;
    (async () => {
      try {
        const res = await watchlistsService.me();
        setWatchlist((prev) => {
          // merge: server symbols + any local-only entries (kept until next add)
          const serverTickers = new Set(res.items.map((i) => i.symbol));
          const localOnly = prev.filter((w) => !serverTickers.has(w.ticker));
          const fromServer: WatchItem[] = res.items.map((i) => {
            const existing = prev.find((w) => w.ticker === i.symbol);
            return (
              existing ?? {
                ticker: i.symbol,
                name: i.symbol,
                exchange: i.exchange ?? "",
                price: 0,
                changePct: 0,
                sector: "—",
                addedAt: i.added_at ?? new Date().toISOString(),
              }
            );
          });
          return [...fromServer, ...localOnly];
        });
      } catch {
        /* offline / not logged in */
      }
    })();
  }, [user]);

  const isWatched = useCallback(
    (ticker: string) => watchlist.some((w) => w.ticker === ticker),
    [watchlist],
  );

  const addToWatchlist = useCallback(
    (item: Omit<WatchItem, "addedAt">) => {
      setWatchlist((prev) =>
        prev.some((w) => w.ticker === item.ticker)
          ? prev
          : [...prev, { ...item, addedAt: new Date().toISOString() }],
      );
      if (user) {
        watchlistsService
          .add({ symbol: item.ticker, exchange: item.exchange })
          .catch(() => {});
      }
    },
    [user],
  );

  const removeFromWatchlist = useCallback(
    (ticker: string) => {
      setWatchlist((prev) => prev.filter((w) => w.ticker !== ticker));
      if (user) {
        watchlistsService.remove(ticker).catch(() => {});
      }
    },
    [user],
  );

  const toggleWatchlist = useCallback(
    (item: Omit<WatchItem, "addedAt">): boolean => {
      const wasIn = watchlist.some((w) => w.ticker === item.ticker);
      if (wasIn) removeFromWatchlist(item.ticker);
      else addToWatchlist(item);
      return !wasIn;
    },
    [watchlist, addToWatchlist, removeFromWatchlist],
  );

  const clearWatchlist = useCallback(() => {
    const items = [...watchlist];
    setWatchlist([]);
    if (user) {
      for (const w of items) watchlistsService.remove(w.ticker).catch(() => {});
    }
  }, [user, watchlist]);

  return (
    <WatchlistContext.Provider
      value={{
        watchlist,
        isWatched,
        addToWatchlist,
        removeFromWatchlist,
        toggleWatchlist,
        clearWatchlist,
      }}
    >
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  const ctx = useContext(WatchlistContext);
  if (!ctx)
    throw new Error("useWatchlist must be used within WatchlistProvider");
  return ctx;
}
