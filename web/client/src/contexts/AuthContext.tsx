/**
 * AuthContext.tsx — 인증 컨텍스트
 *
 * 동작:
 *  - VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY 가 있으면 Supabase 세션 사용.
 *  - 환경변수 미설정 시 localStorage 기반 mock 로그인 (UI 동일).
 *  - 로그인 시 access_token을 localStorage["supabase_jwt"] 에 저장 → lib/http가 Bearer로 전송.
 *  - 공개 API 표면은 mock 시절과 동일하게 유지 (login/logout/updateLastMarket).
 */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { supabase, supabaseEnabled } from "@/lib/supabase";

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
  login: (email?: string, password?: string) => Promise<void> | void;
  loginWithGoogle: () => Promise<void> | void;
  logout: () => Promise<void> | void;
  updateLastMarket: (market: "US" | "KR") => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: false,
  login: () => {},
  loginWithGoogle: () => {},
  logout: () => {},
  updateLastMarket: () => {},
});

const STORAGE_KEY = "financelab_user";
const JWT_KEY = "supabase_jwt";

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

function userFromSupabase(sbUser: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): User {
  const meta = sbUser.user_metadata ?? {};
  const adminEmails = ["admin@financelab.pro", "superadmin@financelab.pro"];
  const email = sbUser.email ?? "";
  return {
    id: sbUser.id,
    email,
    name:
      (meta.full_name as string) ??
      (meta.name as string) ??
      (email || "사용자").split("@")[0],
    avatar: (meta.avatar_url as string) ?? undefined,
    plan: adminEmails.includes(email) ? "premium" : "free",
    lastMarket:
      (typeof window !== "undefined" &&
        (localStorage.getItem("financelab_last_market") as "US" | "KR")) ||
      "US",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (supabaseEnabled && supabase) {
        const { data } = await supabase.auth.getSession();
        if (!cancelled) {
          const session = data.session;
          if (session?.user) {
            setUser(userFromSupabase(session.user));
            localStorage.setItem(JWT_KEY, session.access_token);
          }
          setIsLoading(false);
        }
        const { data: sub } = supabase.auth.onAuthStateChange(
          (_event, session) => {
            if (session?.user) {
              setUser(userFromSupabase(session.user));
              localStorage.setItem(JWT_KEY, session.access_token);
            } else {
              setUser(null);
              localStorage.removeItem(JWT_KEY);
            }
          },
        );
        return () => sub.subscription.unsubscribe();
      }
      // Mock path
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch {
          /* ignore */
        }
      }
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email = "user@example.com", password?: string) => {
    if (supabaseEnabled && supabase && password) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return;
    }
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

  const loginWithGoogle = async () => {
    if (supabaseEnabled && supabase) {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      return;
    }
    return login();
  };

  const logout = async () => {
    if (supabaseEnabled && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(JWT_KEY);
  };

  const updateLastMarket = (market: "US" | "KR") => {
    if (!user) return;
    const updated = { ...user, lastMarket: market };
    setUser(updated);
    if (supabaseEnabled) {
      localStorage.setItem("financelab_last_market", market);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        loginWithGoogle,
        logout,
        updateLastMarket,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
