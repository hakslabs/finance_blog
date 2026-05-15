import { useState, type PropsWithChildren, type ReactNode } from "react";
import { useAuth } from "../../lib/auth-state";
import styles from "./AuthGate.module.css";

function AuthScreen({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <main className={styles.screen}>
      <section className={styles.panel} aria-labelledby="auth-title">
        <p className={styles.eyebrow} translate="no">
          Finance_lab
        </p>
        <h1 id="auth-title" className={styles.title}>
          {title}
        </h1>
        <p className={styles.body}>{body}</p>
        {action}
      </section>
    </main>
  );
}

export function AuthGate({ children }: PropsWithChildren) {
  const auth = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (auth.status === "config-error") {
    return (
      <AuthScreen
        title="Supabase 설정이 필요합니다"
        body="VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 설정한 뒤 다시 실행하세요."
      />
    );
  }

  if (auth.status === "loading") {
    return <AuthScreen title="세션 확인 중" body="로그인 상태를 확인하고 있습니다." />;
  }

  if (auth.status === "signed-out") {
    async function handleSignIn() {
      setSubmitting(true);
      setError(null);
      try {
        await auth.signInWithGoogle();
      } catch (signInError) {
        const message =
          signInError instanceof Error
            ? signInError.message
            : "Google 로그인을 시작하지 못했습니다.";
        setError(message);
        setSubmitting(false);
      }
    }

    return (
      <AuthScreen
        title="Google 계정으로 로그인"
        body="포트폴리오와 관심종목은 로그인한 사용자 기준으로 불러옵니다."
        action={
          <>
            <button
              className={styles.button}
              type="button"
              disabled={submitting}
              onClick={handleSignIn}
            >
              Google로 계속
            </button>
            {error ? <p className={styles.error}>{error}</p> : null}
          </>
        }
      />
    );
  }

  return children;
}
