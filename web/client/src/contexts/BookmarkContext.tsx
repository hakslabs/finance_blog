/**
 * BookmarkContext - 전체 북마크 시스템 (localStorage 기반)
 * 리포트, 학습 가이드, 뉴스, 종목, 거장 북마크를 통합 관리
 * 백엔드 연동 시 localStorage → API 호출로 교체
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface BookmarkState {
  reports: Set<string>;
  guides: Set<string>;
  news: Set<number>;
  stocks: Set<string>;
  masters: Set<string>;
}

interface BookmarkContextType {
  // 리포트
  isReportBookmarked: (id: string) => boolean;
  toggleReportBookmark: (id: string) => void;
  // 학습 가이드
  isGuideBookmarked: (id: string) => boolean;
  toggleGuideBookmark: (id: string) => void;
  // 뉴스
  isNewsBookmarked: (id: number) => boolean;
  toggleNewsBookmark: (id: number) => void;
  // 종목 (관심종목과 별도 - 단순 북마크)
  isStockBookmarked: (ticker: string) => boolean;
  toggleStockBookmark: (ticker: string) => void;
  // 거장 북마크 (제네릭 인터페이스)
  isBookmarked: (type: string, id: string) => boolean;
  addBookmark: (type: string, id: string, meta?: any) => void;
  removeBookmark: (type: string, id: string) => void;
  // 전체 카운트
  totalBookmarks: number;
  // 목록
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

export function BookmarkProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<BookmarkState>(loadFromStorage);

  useEffect(() => { saveToStorage(state); }, [state]);

  const toggle = useCallback(<T,>(key: keyof BookmarkState, id: T) => {
    setState(prev => {
      const set = new Set(prev[key] as Set<T>);
      if (set.has(id)) set.delete(id); else set.add(id);
      return { ...prev, [key]: set };
    });
  }, []);

  const value: BookmarkContextType = {
    isReportBookmarked: (id) => state.reports.has(id),
    toggleReportBookmark: (id) => toggle("reports", id),
    isGuideBookmarked: (id) => state.guides.has(id),
    toggleGuideBookmark: (id) => toggle("guides", id),
    isNewsBookmarked: (id) => state.news.has(id),
    toggleNewsBookmark: (id) => toggle("news", id),
    isStockBookmarked: (ticker) => state.stocks.has(ticker),
    toggleStockBookmark: (ticker) => toggle("stocks", ticker),
    // 제네릭 인터페이스 (거장 등 다양한 타입 지원)
    isBookmarked: (type, id) => {
      if (type === "master") return state.masters.has(id);
      if (type === "report") return state.reports.has(id);
      if (type === "guide") return state.guides.has(id);
      if (type === "stock") return state.stocks.has(id);
      return false;
    },
    addBookmark: (type, id, _meta) => {
      if (type === "master") toggle("masters", id);
      else if (type === "report") toggle("reports", id);
      else if (type === "guide") toggle("guides", id);
      else if (type === "stock") toggle("stocks", id);
    },
    removeBookmark: (type, id) => {
      setState(prev => {
        if (type === "master") {
          const s = new Set(prev.masters); s.delete(id);
          return { ...prev, masters: s };
        }
        if (type === "report") {
          const s = new Set(prev.reports); s.delete(id);
          return { ...prev, reports: s };
        }
        return prev;
      });
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
