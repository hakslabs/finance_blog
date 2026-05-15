import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { AuthContext, type AuthContextValue, type AuthState } from "./auth-state";
import { supabase } from "./supabase";

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState>(
    supabase
      ? { status: "loading", session: null, user: null }
      : { status: "config-error", session: null, user: null },
  );

  useEffect(() => {
    if (!supabase) return undefined;

    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const session = data.session;
      setState(
        session
          ? { status: "signed-in", session, user: session.user }
          : { status: "signed-out", session: null, user: null },
      );
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(
        session
          ? { status: "signed-in", session, user: session.user }
          : { status: "signed-out", session: null, user: null },
      );
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return;
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, signInWithGoogle, signOut }),
    [state, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
