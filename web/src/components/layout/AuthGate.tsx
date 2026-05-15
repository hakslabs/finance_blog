import { useState, type PropsWithChildren } from "react";
import { Link, useLocation } from "react-router-dom";
import { getUserDisplayName } from "../../lib/auth-user";
import { useAuth } from "../../lib/auth-state";
import { PageContainer } from "./PageContainer";
import styles from "./AuthGate.module.css";

export function AuthGate({ children }: PropsWithChildren) {
  const auth = useAuth();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const returnTo = `${window.location.origin}${location.pathname}${location.search}${location.hash}`;

  async function handleSignIn() {
    setSubmitting(true);
    setError(null);
    try {
      await auth.signInWithGoogle(returnTo);
    } catch (signInError) {
      const message =
        signInError instanceof Error
          ? signInError.message
          : "Google 로그인을 시작하지 못했습니다.";
      setError(message);
      setSubmitting(false);
    }
  }

  if (auth.status === "config-error") {
    return (
      <PageContainer
        eyebrow="Account"
        title="로그인 설정이 필요합니다"
        description="Supabase 브라우저 설정이 없거나 올바르지 않아 개인 영역을 열 수 없습니다."
      >
        <div className={styles.panel}>
          <p className={styles.body}>
            VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 Vercel Production 환경에
            설정한 뒤 다시 배포하세요.
          </p>
          <Link className={styles.secondaryLink} to="/">
            홈으로 돌아가기
          </Link>
        </div>
      </PageContainer>
    );
  }

  if (auth.status === "loading") {
    return (
      <PageContainer
        eyebrow="Account"
        title="세션 확인 중"
        description="로그인 상태를 확인하고 있습니다."
      >
        <div className={styles.panel}>
          <div className={styles.loadingLine} aria-hidden="true" />
        </div>
      </PageContainer>
    );
  }

  if (auth.status === "signed-out") {
    return (
      <PageContainer
        eyebrow="Private"
        title="로그인이 필요한 화면입니다"
        description="포트폴리오, 마이페이지, 개인 메모는 계정 기준으로 안전하게 불러옵니다."
      >
        <div className={styles.panel}>
          <div className={styles.promptGrid}>
            <div>
              <p className={styles.panelTitle}>Google 계정으로 계속</p>
              <p className={styles.body}>
                로그인 후 지금 보려던 화면으로 돌아옵니다. 공개 시장 화면은 로그인 없이
                계속 둘러볼 수 있습니다.
              </p>
            </div>
            <div className={styles.actions}>
            <button
              className={styles.button}
              type="button"
              disabled={submitting}
              onClick={handleSignIn}
            >
              {submitting ? "이동 중..." : "Google로 계속"}
            </button>
              <Link className={styles.secondaryLink} to="/">
                홈으로 돌아가기
              </Link>
            </div>
          </div>
          {error ? <p className={styles.error}>{error}</p> : null}
        </div>
      </PageContainer>
    );
  }

  return (
    <>
      <p className="sr-only">{getUserDisplayName(auth.user)} 계정으로 로그인됨</p>
      {children}
    </>
  );
}
