import type { ComponentType } from "react";

type PageModule = { default: ComponentType<any> };
type PageLoader = () => Promise<PageModule>;

export const ROUTE_LOADERS = {
  home: () => import("@/pages/Home"),
  terminal: () => import("@/pages/Terminal"),
  analysis: () => import("@/pages/Analysis"),
  news: () => import("@/pages/News"),
  calendar: () => import("@/pages/Calendar"),
  masters: () => import("@/pages/Masters"),
  masterDetail: () => import("@/pages/MasterDetail"),
  stocks: () => import("@/pages/Stocks"),
  stockDetail: () => import("@/pages/StockDetail"),
  reports: () => import("@/pages/Reports"),
  learn: () => import("@/pages/Learn"),
  learnDetail: () => import("@/pages/LearnDetail"),
  portfolio: () => import("@/pages/Portfolio"),
  mypage: () => import("@/pages/MyPage"),
  admin: () => import("@/pages/Admin"),
  notFound: () => import("@/pages/NotFound"),
} satisfies Record<string, PageLoader>;

const prefetched = new Set<keyof typeof ROUTE_LOADERS>();

function loaderKeyForPath(path: string): keyof typeof ROUTE_LOADERS {
  const cleanPath = path.split("?")[0] || "/";
  if (cleanPath === "/") return "home";
  if (cleanPath.startsWith("/terminal")) return "terminal";
  if (cleanPath.startsWith("/analysis")) return "analysis";
  if (cleanPath.startsWith("/news")) return "news";
  if (cleanPath.startsWith("/calendar")) return "calendar";
  if (cleanPath.startsWith("/masters/")) return "masterDetail";
  if (cleanPath.startsWith("/masters")) return "masters";
  if (cleanPath.startsWith("/stocks/")) return "stockDetail";
  if (cleanPath.startsWith("/stocks")) return "stocks";
  if (cleanPath.startsWith("/reports")) return "reports";
  if (cleanPath.startsWith("/learn/")) return "learnDetail";
  if (cleanPath.startsWith("/learn")) return "learn";
  if (cleanPath.startsWith("/portfolio")) return "portfolio";
  if (cleanPath.startsWith("/mypage")) return "mypage";
  if (cleanPath.startsWith("/admin")) return "admin";
  return "notFound";
}

export function prefetchRoute(path: string): void {
  const key = loaderKeyForPath(path);
  if (prefetched.has(key)) return;
  prefetched.add(key);
  void ROUTE_LOADERS[key]().catch(() => {
    prefetched.delete(key);
  });
}
