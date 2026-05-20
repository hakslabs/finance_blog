/**
 * BookmarkContext — 통합 북마크 (reports/guides/news/stocks/masters).
 *
 * 공개 API 유지. 내부적으로 로그인 사용자는 서버(/me/bookmarks)와 동기화.
 * Backend kind 매핑: reports↔reports, guides↔guides, news↔news, masters↔masters.
 * stocks 는 백엔드 미지원 → localStorage 만.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { bookmarksService, type BookmarkKind } from "@/features/bookmarks";

interface BookmarkState {
  reports: Set<string>;
  guides: Set<string>;
  news: Set<number>;
  stocks: Set<string>;
  masters: Set<string>;
}

interface BookmarkContextType {
  isReportBookmarked: (id: string) => boolean;
  toggleReportBookmark: (id: string) => void;
  isGuideBookmarked: (id: string) => boolean;
  toggleGuideBookmark: (id: string) => void;
  isNewsBookmarked: (id: number) => boolean;
  toggleNewsBookmark: (id: number) => void;
  isStockBookmarked: (ticker: string) => boolean;
  toggleStockBookmark: (ticker: string) => void;
  isBookmarked: (type: string, id: string) => boolean;
  addBookmark: (type: string, id: string, meta?: any) => void;
  removeBookmark: (type: string, id: string) => void;
  totalBookmarks: number;
  bookmarkedReportIds: string[];
  bookmarkedGuideIds: string[];
}

export const BookmarkContext = createContext<BookmarkContextType | null>(null);
const STORAGE_KEY = "financelab_bookmarks";

function loadFromStorage(): BookmarkState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { reports: new Set(), guides: new Set(), news: new Set(), stocks: new Set(), masters: new Set() };
    const parsed = JSON.parse(raw);
    return {
      reports: new Set<string>(parsed.reports || []),
      guides: new Set<string>(parsed.guides || []),
      news: new Set<number>(parsed.news || []),
      stocks: new Set<string>(parsed.stocks || []),
      masters: new Set<string>(parsed.masters || []),
    };
  } catch {
    return { reports: new Set(), guides: new Set(), news: new Set(), stocks: new Set(), masters: new Set() };
  }
}
function saveToStorage(state: BookmarkState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      reports: Array.from(state.reports),
      guides: Array.from(state.guides),
      news: Array.from(state.news),
      stocks: Array.from(state.stocks),
      masters: Array.from(state.masters),
    }));
  } catch {}
}

const sync = (user: { id: string } | null, kind: BookmarkKind, ref: string, present: boolean) => {
  if (!user) return;
  (present ? bookmarksService.add(kind, ref) : bookmarksService.remove(kind, ref)).catch(() => {});
};

export function BookmarkProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<BookmarkState>(loadFromStorage);
  useEffect(() => { saveToStorage(state); }, [state]);

  // Hydrate from server on login
  const hydratedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!user) { hydratedFor.current = null; return; }
    if (hydratedFor.current === user.id) return;
    hydratedFor.current = user.id;
    (async () => {
      try {
        const res = await bookmarksService.list();
        setState((prev) => {
          const next = { ...prev };
          for (const it of res.items) {
            if (it.kind === "reports") next.reports = new Set([...prev.reports, it.ref]);
            else if (it.kind === "guides") next.guides = new Set([...prev.guides, it.ref]);
            else if (it.kind === "news") next.news = new Set([...prev.news, Number(it.ref)]);
            else if (it.kind === "masters") next.masters = new Set([...prev.masters, it.ref]);
          }
          return next;
        });
      } catch { /* */ }
    })();
  }, [user]);

  const toggleReport = useCallback((id: string) => {
    setState(prev => {
      const s = new Set(prev.reports);
      const wasIn = s.has(id);
      if (wasIn) s.delete(id); else s.add(id);
      sync(user, "reports", id, !wasIn);
      return { ...prev, reports: s };
    });
  }, [user]);

  const toggleGuide = useCallback((id: string) => {
    setState(prev => {
      const s = new Set(prev.guides);
      const wasIn = s.has(id);
      if (wasIn) s.delete(id); else s.add(id);
      sync(user, "guides", id, !wasIn);
      return { ...prev, guides: s };
    });
  }, [user]);

  const toggleNews = useCallback((id: number) => {
    setState(prev => {
      const s = new Set(prev.news);
      const wasIn = s.has(id);
      if (wasIn) s.delete(id); else s.add(id);
      sync(user, "news", String(id), !wasIn);
      return { ...prev, news: s };
    });
  }, [user]);

  const toggleStock = useCallback((ticker: string) => {
    setState(prev => {
      const s = new Set(prev.stocks);
      if (s.has(ticker)) s.delete(ticker); else s.add(ticker);
      return { ...prev, stocks: s };
    });
  }, []);

  const toggleMaster = useCallback((id: string) => {
    setState(prev => {
      const s = new Set(prev.masters);
      const wasIn = s.has(id);
      if (wasIn) s.delete(id); else s.add(id);
      sync(user, "masters", id, !wasIn);
      return { ...prev, masters: s };
    });
  }, [user]);

  const value: BookmarkContextType = {
    isReportBookmarked: (id) => state.reports.has(id),
    toggleReportBookmark: toggleReport,
    isGuideBookmarked: (id) => state.guides.has(id),
    toggleGuideBookmark: toggleGuide,
    isNewsBookmarked: (id) => state.news.has(id),
    toggleNewsBookmark: toggleNews,
    isStockBookmarked: (ticker) => state.stocks.has(ticker),
    toggleStockBookmark: toggleStock,
    isBookmarked: (type, id) => {
      if (type === "master") return state.masters.has(id);
      if (type === "report") return state.reports.has(id);
      if (type === "guide") return state.guides.has(id);
      if (type === "stock") return state.stocks.has(id);
      return false;
    },
    addBookmark: (type, id) => {
      if (type === "master") toggleMaster(id);
      else if (type === "report") toggleReport(id);
      else if (type === "guide") toggleGuide(id);
      else if (type === "stock") toggleStock(id);
    },
    removeBookmark: (type, id) => {
      if (type === "master" && state.masters.has(id)) toggleMaster(id);
      else if (type === "report" && state.reports.has(id)) toggleReport(id);
      else if (type === "guide" && state.guides.has(id)) toggleGuide(id);
      else if (type === "stock" && state.stocks.has(id)) toggleStock(id);
    },
    totalBookmarks: state.reports.size + state.guides.size + state.news.size + state.stocks.size + state.masters.size,
    bookmarkedReportIds: Array.from(state.reports),
    bookmarkedGuideIds: Array.from(state.guides),
  };

  return <BookmarkContext.Provider value={value}>{children}</BookmarkContext.Provider>;
}

export function useBookmark() {
  const ctx = useContext(BookmarkContext);
  if (!ctx) throw new Error("useBookmark must be used within BookmarkProvider");
  return ctx;
}
