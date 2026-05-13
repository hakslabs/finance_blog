export type NavItem = {
  label: string;
  labelEn: string;
  path: string;
  aliases?: string[];
};

export const primaryNavItems: NavItem[] = [
  { label: "홈", labelEn: "Home", path: "/", aliases: ["/dashboard"] },
  { label: "분석", labelEn: "Analysis", path: "/analysis" },
  { label: "종목 검색", labelEn: "Stocks", path: "/stocks" },
  { label: "고수 따라잡기", labelEn: "Masters", path: "/masters" },
  { label: "리포트", labelEn: "Reports", path: "/reports" },
  { label: "학습", labelEn: "Learn", path: "/learn" },
  { label: "포트폴리오", labelEn: "Portfolio", path: "/portfolio" },
];

export const utilityNavItems: NavItem[] = [
  { label: "마이페이지", labelEn: "My Page", path: "/mypage" },
  { label: "관리자", labelEn: "Admin", path: "/admin" },
];

export function isNavActive(pathname: string, item: NavItem) {
  if (item.path === "/") {
    return pathname === "/" || item.aliases?.includes(pathname);
  }

  return pathname === item.path || pathname.startsWith(`${item.path}/`);
}

export function getCurrentNavItem(pathname: string) {
  const items = [...primaryNavItems, ...utilityNavItems];
  return (
    items.find((item) => isNavActive(pathname, item)) ?? primaryNavItems[0]
  );
}
