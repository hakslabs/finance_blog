/**
 * AuthContext.tsx — 인증 컨텍스트
 * Google OAuth 연동 준비 구조
 * 현재: 로컬 mock 로그인 (실제 OAuth 연동 시 handleGoogleLogin 구현)
 */
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type User = {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  plan: "free" | "premium";
  lastMarket?: "US" | "KR";
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (email?: string) => void;
  logout: () => void;
  updateLastMarket: (market: "US" | "KR") => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: false,
  login: () => {},
  logout: () => {},
  updateLastMarket: () => {},
});

const STORAGE_KEY = "financelab_user";

// Mock users for demo (Google OAuth 연동 전 테스트용)
const MOCK_USERS: Record<string, User> = {
  "user@example.com": {
    id: "u1",
    email: "user@example.com",
    name: "투자자",
    plan: "free",
    lastMarket: "US",
  },
  "admin@financelab.pro": {
    id: "admin1",
    email: "admin@financelab.pro",
    name: "관리자",
    plan: "premium",
    lastMarket: "US",
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 로컬 스토리지에서 세션 복원
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {}
    }
    setIsLoading(false);
  }, []);

  const login = (email = "user@example.com") => {
    // Google OAuth 연동 시 이 함수를 Google OAuth 플로우로 교체
    // 현재는 mock 로그인
    const mockUser = MOCK_USERS[email] ?? {
      id: `u_${Date.now()}`,
      email,
      name: email.split("@")[0],
      plan: "free" as const,
      lastMarket: "US" as const,
    };
    setUser(mockUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const updateLastMarket = (market: "US" | "KR") => {
    if (!user) return;
    const updated = { ...user, lastMarket: market };
    setUser(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateLastMarket }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
