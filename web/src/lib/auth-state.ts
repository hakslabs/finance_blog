import type { Session, User } from "@supabase/supabase-js";
import { createContext, useContext } from "react";

export type AuthState =
  | { status: "config-error"; session: null; user: null }
  | { status: "loading"; session: null; user: null }
  | { status: "signed-out"; session: null; user: null }
  | { status: "signed-in"; session: Session; user: User };

export type AuthContextValue = AuthState & {
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return value;
}
