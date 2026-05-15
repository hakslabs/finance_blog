import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

export type Currency = "KRW" | "USD";

/**
 * Hardcoded FX rate. Replace with a live FX feed when the backend is wired up.
 */
export const KRW_PER_USD = 1380;

const STORAGE_KEY = "finance-lab:currency";
const DEFAULT_CURRENCY: Currency = "KRW";

type CurrencyContextValue = {
  currency: Currency;
  setCurrency: (next: Currency) => void;
  toggle: () => void;
  /** Convert a numeric value from `fromCurrency` to the active currency and format it. */
  format: (value: number, fromCurrency: Currency) => string;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function readInitial(): Currency {
  if (typeof window === "undefined") return DEFAULT_CURRENCY;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === "KRW" || raw === "USD") return raw;
  return DEFAULT_CURRENCY;
}

function convert(value: number, from: Currency, to: Currency): number {
  if (from === to) return value;
  if (from === "USD" && to === "KRW") return value * KRW_PER_USD;
  if (from === "KRW" && to === "USD") return value / KRW_PER_USD;
  return value;
}

export function formatCurrency(value: number, currency: Currency): string {
  if (currency === "KRW") {
    const rounded = Math.round(value);
    return `₩${rounded.toLocaleString("ko-KR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  }
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function CurrencyProvider({ children }: PropsWithChildren) {
  const [currency, setCurrencyState] = useState<Currency>(readInitial);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, currency);
  }, [currency]);

  const setCurrency = useCallback((next: Currency) => {
    setCurrencyState(next);
  }, []);

  const toggle = useCallback(() => {
    setCurrencyState((value) => (value === "KRW" ? "USD" : "KRW"));
  }, []);

  const format = useCallback(
    (value: number, fromCurrency: Currency) =>
      formatCurrency(convert(value, fromCurrency, currency), currency),
    [currency],
  );

  const value = useMemo<CurrencyContextValue>(
    () => ({ currency, setCurrency, toggle, format }),
    [currency, setCurrency, toggle, format],
  );

  return (
    <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const value = useContext(CurrencyContext);
  if (!value) {
    throw new Error("useCurrency must be used inside CurrencyProvider.");
  }
  return value;
}
