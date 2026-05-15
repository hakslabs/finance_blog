import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

export type Lang = "ko" | "en";

const STORAGE_KEY = "finance-lab:lang";
const DEFAULT_LANG: Lang = "ko";

type LangPair = { ko: string; en: string };

/**
 * Centralised labels for language-aware controls in the shell.
 * Body content remains Korean — see the MyPage settings notice.
 */
export const SHELL_LABELS = {
  currencyToggleAria: {
    ko: "기준 통화 전환",
    en: "Toggle base currency",
  },
  langToggleAria: {
    ko: "언어 전환",
    en: "Toggle language",
  },
  savedItems: { ko: "저장", en: "Saved" },
  notifications: { ko: "알림", en: "Alerts" },
  notificationsHeader: { ko: "알림", en: "Notifications" },
  markAllRead: { ko: "모두 확인", en: "Mark all read" },
  signIn: { ko: "로그인", en: "Sign in" },
  signingIn: { ko: "확인 중", en: "Checking" },
  account: { ko: "계정 메뉴 열기", en: "Open account menu" },
  home: { ko: "홈", en: "Home" },
  mypage: { ko: "마이페이지", en: "My Page" },
  portfolio: { ko: "포트폴리오", en: "Portfolio" },
  savedReports: { ko: "관심 리포트", en: "Saved Reports" },
  signOut: { ko: "로그아웃", en: "Sign out" },
  partialI18nNote: {
    ko: "한·영 본문 전환은 추후 도입 예정",
    en: "Full Korean/English content switching coming later",
  },
} as const satisfies Record<string, LangPair>;

type LanguageContextValue = {
  lang: Lang;
  setLang: (next: Lang) => void;
  toggle: () => void;
  /** Pick a label from a pair. Defaults to `ko` field if `en` is missing. */
  pick: (pair: LangPair) => string;
  /** Pick from arbitrary `{label, labelEn}`-style record. */
  pickLabel: (entry: { label: string; labelEn?: string }) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readInitial(): Lang {
  if (typeof window === "undefined") return DEFAULT_LANG;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === "ko" || raw === "en") return raw;
  return DEFAULT_LANG;
}

export function LanguageProvider({ children }: PropsWithChildren) {
  const [lang, setLangState] = useState<Lang>(readInitial);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, lang);
  }, [lang]);

  const setLang = useCallback((next: Lang) => setLangState(next), []);
  const toggle = useCallback(() => {
    setLangState((value) => (value === "ko" ? "en" : "ko"));
  }, []);

  const pick = useCallback(
    (pair: LangPair) => (lang === "en" ? pair.en || pair.ko : pair.ko),
    [lang],
  );

  const pickLabel = useCallback(
    (entry: { label: string; labelEn?: string }) =>
      lang === "en" ? entry.labelEn || entry.label : entry.label,
    [lang],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({ lang, setLang, toggle, pick, pickLabel }),
    [lang, setLang, toggle, pick, pickLabel],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const value = useContext(LanguageContext);
  if (!value) {
    throw new Error("useLanguage must be used inside LanguageProvider.");
  }
  return value;
}
