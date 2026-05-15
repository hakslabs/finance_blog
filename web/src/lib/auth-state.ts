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

export function getUserDisplayName(user: User): string {
  const metadata = user.user_metadata;
  const name =
    metadata.full_name ?? metadata.name ?? metadata.preferred_username ?? user.email;
  return typeof name === "string" && name.trim() ? name.trim() : "사용자";
}

export function getUserInitial(user: User): string {
  return getUserDisplayName(user).charAt(0).toUpperCase();
}
