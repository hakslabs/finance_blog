import {
  BarChart3,
  BriefcaseBusiness,
  FileText,
  GraduationCap,
  Home,
  Search,
  Shield,
  Trophy,
  User,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  labelEn: string;
  path: string;
  icon: LucideIcon;
  aliases?: string[];
  adminOnly?: boolean;
};

export const primaryNavItems: NavItem[] = [
  { label: "홈", labelEn: "Home", path: "/", icon: Home, aliases: ["/dashboard"] },
  { label: "분석", labelEn: "Analysis", path: "/analysis", icon: BarChart3 },
  { label: "종목 검색", labelEn: "Stocks", path: "/stocks", icon: Search },
  { label: "고수 따라잡기", labelEn: "Masters", path: "/masters", icon: Trophy },
  { label: "리포트", labelEn: "Reports", path: "/reports", icon: FileText },
  { label: "학습", labelEn: "Learn", path: "/learn", icon: GraduationCap },
  { label: "포트폴리오", labelEn: "Portfolio", path: "/portfolio", icon: BriefcaseBusiness },
];

export const utilityNavItems: NavItem[] = [
  { label: "마이페이지", labelEn: "My Page", path: "/mypage", icon: User },
  { label: "관리자", labelEn: "Admin", path: "/admin", icon: Shield, adminOnly: true },
];

export function getVisibleNavItems(items: NavItem[], isAdmin: boolean): NavItem[] {
  return items.filter((item) => !item.adminOnly || isAdmin);
}

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
