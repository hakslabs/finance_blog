/**
 * MyPage.tsx — 마이페이지 v3 (전면 개편)
 * Design: 다크 모노 + 에메랄드 액센트
 * Features:
 *  - 포트폴리오: 총액/수익 단위 표시, 보유종목 클릭 상세 모달
 *  - 관심종목: 실시간 검색/추가, 종목 클릭 상세 모달 (차트+지표)
 *  - 거래내역: 거래 추가 모달, 일/주/월/년별 수익 계산 차트
 *  - 투자일지: 거래내역 기반 자동 연동, 미등록 거래 모의투자 체크
 *  - 알람 설정: 투자일지 기반 등록
 *  - 북마크: 팔로우/북마크 통합 (거장은 단일 관리)
 */
import {
  useState,
  useMemo,
  useContext,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { MASTERS, REPORTS, LEARN_GUIDES } from "@/services/mockData";
import {
  LayoutDashboard,
  Star,
  ClipboardList,
  BookOpen,
  Bell,
  Bookmark,
  Plus,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  BarChart3,
  Search,
  TrendingUp,
  TrendingDown,
  FileText,
  GraduationCap,
  BookmarkCheck,
  Users,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Activity,
  Layers,
  Newspaper,
} from "lucide-react";
import { toast } from "sonner";
import {
  BookmarkContext,
  type BookmarkItem,
  type BookmarkType,
} from "@/contexts/BookmarkContext";
import { FollowContext } from "@/contexts/FollowContext";
import { useWatchlist } from "@/contexts/WatchlistContext";
import { useAlertsBackendSync } from "@/features/alerts/sync";
import { usePortfolioAnalytics } from "@/features/portfolio";
import { useTradesBackendSync } from "@/features/portfolio/sync";
import { useJournalsBackendSync } from "@/features/memos/sync";
import { stocksService } from "@/features/stocks/service";
import { useStockSearch, useStocks } from "@/features/stocks";
import { ModalPortal } from "@/components/ModalPortal";
import StockMiniChart from "@/components/StockMiniChart";
import KLineSeriesChart from "@/components/KLineSeriesChart";
import type { Stock } from "@/types";

// ── Helpers ──────────────────────────────────────────────────
function isKRTicker(ticker: string) {
  return /^\d{6}(\.(KS|KQ))?$/.test(ticker.trim().toUpperCase());
}
function fmtKRW(n: number) {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억원`;
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만원`;
  return `${n.toLocaleString()}원`;
}
function fmtUSD(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}
function fmtPct(n: number) {
  return `${Number.isFinite(n) ? n.toFixed(2) : "0.00"}%`;
}
function fmtPrice(price: number, ticker: string) {
  return isKRTicker(ticker)
    ? `₩${price.toLocaleString()}`
    : `$${price.toFixed(2)}`;
}
function fmtValue(total: number, ticker: string) {
  return isKRTicker(ticker) ? fmtKRW(total) : fmtUSD(total);
}

async function fetchLatestBarQuote(
  ticker: string,
  init?: RequestInit,
): Promise<{
  price: number;
  changePct: number;
}> {
  const bars = (await stocksService.bars(ticker, 30, init)).items;
  const latest = bars.at(-1);
  const prev = bars.at(-2);
  const price = latest?.close ?? 0;
  const changePct =
    latest && prev && prev.close > 0
      ? ((latest.close - prev.close) / prev.close) * 100
      : 0;
  return { price, changePct };
}

function useLiveStockUniverse() {
  const { data: usStocks, loading: usLoading } = useStocks("US");
  const { data: krStocks, loading: krLoading } = useStocks("KR");
  const stocks = useMemo(
    () => [...(usStocks ?? []), ...(krStocks ?? [])],
    [usStocks, krStocks],
  );
  const byTicker = useMemo(
    () => new Map(stocks.map((stock) => [stock.ticker, stock])),
    [stocks],
  );
  return { stocks, byTicker, loading: usLoading || krLoading };
}

// ── localStorage hook ─────────────────────────────────────────
function useLocalState<T>(key: string, init: T) {
  const [val, setVal] = useState<T>(() => {
    try {
      const s = localStorage.getItem(key);
      return s ? JSON.parse(s) : init;
    } catch {
      return init;
    }
  });
  const set = useCallback(
    (v: T | ((prev: T) => T)) => {
      setVal((prev) => {
        const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    [key],
  );
  return [val, set] as const;
}

// ── Types ─────────────────────────────────────────────────────
interface Trade {
  id: string;
  date: string;
  symbol: string;
  name: string;
  type: "매수" | "매도";
  shares: number;
  price: number;
  total: number;
  fee: number;
  note: string;
  journalLinked: boolean;
}
interface Journal {
  id: string;
  date: string;
  symbol: string;
  name: string;
  type: "매수" | "매도";
  reason: string;
  target: number;
  stopLoss: number;
  status: "진행중" | "완료" | "손절";
  tradeId?: string;
  isMock: boolean;
  followUps: { date: string; note: string }[];
}
interface AlertItem {
  id: string;
  symbol: string;
  name: string;
  type: "목표가 도달" | "손절 라인" | "거래량 급증" | "뉴스 알림";
  condition: string;
  status: "활성" | "완료" | "비활성";
  created: string;
  journalId?: string;
}

// ── Initial Data ──────────────────────────────────────────────
const INIT_JOURNALS: Journal[] = [
  {
    id: "j1",
    date: "2026-05-15",
    symbol: "NVDA",
    name: "엔비디아",
    type: "매수",
    reason:
      "AI 인프라 투자 사이클이 2-3년 지속될 것으로 판단. 데이터센터 GPU 수요는 구조적 성장. 현재 PER 40배는 성장률 대비 합리적.",
    target: 1000,
    stopLoss: 750,
    status: "진행중",
    tradeId: "t1",
    isMock: false,
    followUps: [
      { date: "2026-05-16", note: "실적 발표 예정. 가이던스 확인 필요." },
      { date: "2026-05-18", note: "실적 서프라이즈. 목표가 상향 검토." },
    ],
  },
  {
    id: "j2",
    date: "2026-04-28",
    symbol: "TSLA",
    name: "테슬라",
    type: "매도",
    reason: "목표가 $250 도달. 경쟁 심화로 마진 압박 우려. 단기 차익 실현.",
    target: 250,
    stopLoss: 200,
    status: "완료",
    tradeId: "t3",
    isMock: false,
    followUps: [
      {
        date: "2026-04-29",
        note: "매도 후 추가 상승 +3%. 아쉽지만 원칙 준수.",
      },
    ],
  },
  {
    id: "j3",
    date: "2026-05-01",
    symbol: "AMZN",
    name: "아마존",
    type: "매수",
    reason:
      "AWS 성장세 지속, 광고 매출 급증. 목표가 $220 설정. (모의투자 - 아직 실제 매수 미등록)",
    target: 220,
    stopLoss: 165,
    status: "진행중",
    isMock: true,
    followUps: [],
  },
];
const INIT_ALERTS: AlertItem[] = [
  {
    id: "a1",
    symbol: "NVDA",
    name: "엔비디아",
    type: "목표가 도달",
    condition: "≥ $1,000",
    status: "활성",
    created: "2026-05-15",
    journalId: "j1",
  },
  {
    id: "a2",
    symbol: "AAPL",
    name: "애플",
    type: "손절 라인",
    condition: "≤ $160",
    status: "활성",
    created: "2026-05-10",
  },
  {
    id: "a3",
    symbol: "005930",
    name: "삼성전자",
    type: "목표가 도달",
    condition: "≥ ₩90,000",
    status: "활성",
    created: "2026-04-15",
  },
  {
    id: "a4",
    symbol: "TSLA",
    name: "테슬라",
    type: "목표가 도달",
    condition: "≥ $250",
    status: "완료",
    created: "2026-04-01",
    journalId: "j2",
  },
];
// Portfolio chart data is generated dynamically in PortfolioTab based on selected period
const SECTOR_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
];

// ── Stock Detail Modal ────────────────────────────────────────
function StockDetailModal({
  ticker,
  onClose,
  onAddTrade,
}: {
  ticker: string;
  onClose: () => void;
  onAddTrade?: (ticker: string) => void;
}) {
  const { byTicker } = useLiveStockUniverse();
  const stock = byTicker.get(ticker);
  const [miniBars, setMiniBars] = useState<{ date: string; close: number }[]>(
    [],
  );
  const [miniLoading, setMiniLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setMiniLoading(true);
    setMiniBars([]);
    stocksService
      .bars(ticker, 30, { signal: controller.signal })
      .then((r) => {
        if (cancelled) return;
        setMiniBars(
          r.items.map((bar) => ({ date: bar.date, close: bar.close })),
        );
        setMiniLoading(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        if (cancelled) return;
        setMiniBars([]);
        setMiniLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [ticker]);
  const isKR = isKRTicker(ticker);
  const latestClose = miniBars.at(-1)?.close ?? stock?.price ?? 0;
  const prevClose = miniBars.at(-2)?.close ?? latestClose;
  const liveChangePct =
    prevClose > 0
      ? ((latestClose - prevClose) / prevClose) * 100
      : (stock?.changePct ?? 0);
  const displayStock: Stock = {
    ticker,
    name: stock?.name ?? ticker,
    price: latestClose,
    change: latestClose - prevClose,
    changePct: liveChangePct,
    volume: stock?.volume ?? 0,
    marketCap: stock?.marketCap ?? "",
    sector: stock?.sector ?? "—",
    exchange: stock?.exchange ?? (isKR ? "KOSPI" : "NASDAQ"),
    country: stock?.country ?? (isKR ? "KR" : "US"),
    pe: stock?.pe,
    roe: stock?.roe,
  };
  const changeColor = displayStock.changePct >= 0 ? "text-up" : "text-down";
  const strokeColor = displayStock.changePct >= 0 ? "#10b981" : "#ef4444";
  const miniData = miniBars.map((bar) => ({
    date: bar.date,
    value: bar.close,
  }));
  const miniPriceData = miniData.filter(
    (point) => Number.isFinite(point.value) && point.value > 0,
  );
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        />
        <div className="relative bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
          <div className="p-5 border-b border-border">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono bg-muted/50 px-2 py-0.5 rounded text-muted-foreground">
                    {ticker}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {displayStock.exchange}
                  </span>
                </div>
                <h2 className="text-lg font-bold font-['Outfit']">
                  {displayStock.name}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-bold font-mono">
                    {displayStock.price > 0
                      ? fmtPrice(displayStock.price, ticker)
                      : "—"}
                  </span>
                  <span
                    className={cn(
                      "flex items-center gap-0.5 text-sm font-semibold",
                      changeColor,
                    )}
                  >
                    {displayStock.changePct >= 0 ? (
                      <ArrowUpRight size={14} />
                    ) : (
                      <ArrowDownRight size={14} />
                    )}
                    {Math.abs(displayStock.changePct).toFixed(2)}%
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
              >
                <X size={15} />
              </button>
            </div>
          </div>
          <div className="px-5 pt-4">
            <div className="h-[72px]">
              {miniLoading ? (
                <div className="h-full rounded-lg bg-muted/20 animate-pulse" />
              ) : miniPriceData.length > 1 ? (
                <StockMiniChart
                  data={miniPriceData}
                  height={72}
                  color={strokeColor}
                  interactive
                  valueKind="price"
                  valueFormatter={(value) =>
                    fmtPrice(value, displayStock.ticker)
                  }
                  sourceLabel="DB"
                  sourceTone="primary"
                  sourceTitle={`DB 일봉 ${miniPriceData[0].date} ~ ${
                    miniPriceData[miniPriceData.length - 1].date
                  } · ${miniPriceData.length.toLocaleString()}행`}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  최근 가격 데이터를 불러올 수 없습니다
                </div>
              )}
            </div>
            {miniPriceData.length > 1 && (
              <div className="mt-1 text-[10px] text-muted-foreground font-mono">
                DB 일봉 {miniPriceData[0].date} ~{" "}
                {miniPriceData[miniPriceData.length - 1].date}
              </div>
            )}
          </div>
          <div className="p-5 grid grid-cols-2 gap-3">
            {[
              { label: "시가총액", value: displayStock.marketCap || "—" },
              { label: "섹터", value: displayStock.sector },
              {
                label: "PER",
                value: displayStock.pe != null ? `${displayStock.pe}x` : "—",
              },
              {
                label: "ROE",
                value: displayStock.roe != null ? `${displayStock.roe}%` : "—",
              },
            ].map(({ label, value }) => (
              <div key={label} className="bg-muted/20 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-0.5">
                  {label}
                </div>
                <div className="text-sm font-semibold">{value}</div>
              </div>
            ))}
          </div>
          <div className="px-5 pb-5 flex gap-2">
            <button
              onClick={() => {
                if (onAddTrade) {
                  onAddTrade(ticker);
                  onClose();
                } else
                  toast.info("거래 추가는 거래내역 탭에서 이용할 수 있어요");
              }}
              className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              거래 추가
            </button>
            <button
              onClick={() => toast.info("상세 분석 페이지 준비 중")}
              className="flex-1 py-2 rounded-lg bg-muted/50 text-foreground text-sm font-medium hover:bg-muted transition-colors"
            >
              상세 분석
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

// Append-to-localStorage helpers used by tabs that don't own the
// trades/journals state but still want to register from inside
// StockDetailModal (Portfolio / Watchlist tabs). The owning tab
// (Trades / Journal) picks the new rows up on next mount via its
// useLocalState rehydration.
function appendToLocalArray<T>(key: string, item: T) {
  try {
    const raw = localStorage.getItem(key);
    const arr: T[] = raw ? JSON.parse(raw) : [];
    arr.push(item);
    localStorage.setItem(key, JSON.stringify(arr));
  } catch {
    /* localStorage disabled — skip */
  }
}

function readLocalArray<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : fallback;
  } catch {
    return fallback;
  }
}

// Sum the net (= 매수 − 매도) shares per symbol from the trades log.
// Used to gate 매도 entries in AddTradeModal so the user can't sell
// shares they don't have, and to surface the current position next to
// the symbol picker as a sanity check.
function netSharesByTrade(trades: Trade[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of trades) {
    const delta = t.type === "매수" ? t.shares : -t.shares;
    out[t.symbol] = (out[t.symbol] ?? 0) + delta;
  }
  return out;
}

function buildHoldingsFromTrades(
  trades: Trade[],
  stockByTicker: Map<string, Stock>,
) {
  const bySymbol: Record<
    string,
    { shares: number; totalCost: number; name: string }
  > = {};
  for (const trade of [...trades].sort((a, b) =>
    a.date.localeCompare(b.date),
  )) {
    const row =
      bySymbol[trade.symbol] ??
      (bySymbol[trade.symbol] = {
        shares: 0,
        totalCost: 0,
        name: trade.name,
      });
    if (trade.type === "매수") {
      row.shares += trade.shares;
      row.totalCost += trade.price * trade.shares + trade.fee;
    } else if (row.shares > 0) {
      const sellShares = Math.min(row.shares, trade.shares);
      const avgCost = row.totalCost / row.shares;
      row.shares -= sellShares;
      row.totalCost -= avgCost * sellShares;
    }
  }

  return Object.entries(bySymbol)
    .filter(([, row]) => row.shares > 0)
    .map(([symbol, row]) => {
      const stock = stockByTicker.get(symbol);
      const currentPrice = stock?.price ?? row.totalCost / row.shares;
      const avgPrice = row.totalCost / row.shares;
      const isKR = isKRTicker(symbol);
      const pnl = (currentPrice - avgPrice) * row.shares;
      const pnlP =
        avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;
      const marketValue = currentPrice * row.shares;
      return {
        symbol,
        name: stock?.name ?? row.name,
        shares: row.shares,
        avgPrice,
        currentPrice,
        sector: stock?.sector ?? "기타",
        isKR,
        pnl,
        pnlP,
        marketValue,
      };
    });
}

function flowPeriodToApi(
  period: "주" | "월" | "년",
): "week" | "month" | "year" {
  return period === "주" ? "week" : period === "년" ? "year" : "month";
}

function pnlPeriodToApi(
  period: "일" | "주" | "월" | "년",
): "day" | "week" | "month" | "year" {
  if (period === "일") return "day";
  if (period === "주") return "week";
  if (period === "년") return "year";
  return "month";
}

// ── Add Trade Modal ───────────────────────────────────────────
function AddTradeModal({
  onClose,
  onAdd,
  onAddJournal,
  currentHoldings,
  prefillSymbol,
}: {
  onClose: () => void;
  onAdd: (t: Trade) => void;
  // Called once per submit when the user opted into auto-creating a
  // journal AND filled the journal fields. TradesTab writes the
  // resulting entry into the `financelab_journals` localStorage key
  // so the Journal tab picks it up on its next mount.
  onAddJournal?: (j: Journal) => void;
  currentHoldings: Record<string, number>;
  prefillSymbol?: string;
}) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const { byTicker } = useLiveStockUniverse();
  const prefillStock = prefillSymbol ? byTicker.get(prefillSymbol) : undefined;
  const [selectedName, setSelectedName] = useState(prefillStock?.name ?? "");
  const [form, setForm] = useState({
    date: todayIso,
    symbol: prefillStock?.ticker ?? "",
    type: "매수" as "매수" | "매도",
    shares: "",
    price: prefillStock ? String(prefillStock.price) : "",
    fee: "",
    note: "",
    createJournal: true,
    // Journal fields — only validated when createJournal is on.
    reason: "",
    target: "",
    stopLoss: "",
  });
  const [search, setSearch] = useState(
    prefillStock ? `${prefillStock.ticker} ${prefillStock.name}` : "",
  );
  const [showSearch, setShowSearch] = useState(false);
  const { data: searchResults = [], loading: searchLoading } = useStockSearch(
    showSearch && !form.symbol ? search : "",
    8,
  );
  const tradeSearchResults = searchResults ?? [];
  const quoteControllerRef = useRef<AbortController | null>(null);
  const [touched, setTouched] = useState({
    symbol: false,
    shares: false,
    price: false,
    date: false,
    fee: false,
    reason: false,
    target: false,
    stopLoss: false,
  });
  useEffect(
    () => () => {
      quoteControllerRef.current?.abort();
    },
    [],
  );
  // ── Validation ───────────────────────────────────────────────
  // Field-level rules. `error` is non-null when the field is invalid
  // (regardless of `touched`); the UI only paints the error red once
  // the user has either touched the field or tried to submit.
  const sharesNum = parseFloat(form.shares);
  const priceNum = parseFloat(form.price);
  const feeNum = form.fee.trim() === "" ? NaN : parseFloat(form.fee);
  const heldShares = form.symbol ? (currentHoldings[form.symbol] ?? 0) : 0;
  const stockIsKR = form.symbol ? isKRTicker(form.symbol) : false;
  const isInUniverse = !!form.symbol;

  const targetNum = form.target.trim() === "" ? NaN : parseFloat(form.target);
  const stopLossNum =
    form.stopLoss.trim() === "" ? NaN : parseFloat(form.stopLoss);

  const errors: {
    symbol?: string;
    shares?: string;
    price?: string;
    date?: string;
    fee?: string;
    reason?: string;
    target?: string;
    stopLoss?: string;
  } = {};
  if (!form.symbol) errors.symbol = "검색 결과에서 종목을 선택해주세요";

  if (!form.shares) errors.shares = "수량을 입력해주세요";
  else if (!isFinite(sharesNum) || sharesNum <= 0)
    errors.shares = "0보다 큰 수량을 입력해주세요";
  else if (stockIsKR && !Number.isInteger(sharesNum))
    errors.shares = "국내 주식은 1주 단위로 거래합니다";
  else if (
    form.type === "매도" &&
    form.symbol &&
    isInUniverse &&
    sharesNum > heldShares
  ) {
    errors.shares =
      heldShares > 0
        ? `보유 ${heldShares}주를 초과합니다`
        : "보유 중이지 않은 종목입니다";
  }

  if (!form.price) errors.price = "단가를 입력해주세요";
  else if (!isFinite(priceNum) || priceNum <= 0)
    errors.price = "0보다 큰 단가를 입력해주세요";

  if (!form.date) errors.date = "거래 날짜를 선택해주세요";
  else if (form.date > todayIso) errors.date = "미래 날짜는 등록할 수 없습니다";

  if (form.fee.trim() !== "" && (!isFinite(feeNum) || feeNum < 0)) {
    errors.fee = "수수료는 0 이상이어야 합니다";
  }

  // Journal fields are only required when the user opted in. The
  // target / stop-loss sanity checks (target above buy price, stop
  // below buy price for 매수; the reverse for 매도) keep the user
  // from registering nonsense alerts later.
  if (form.createJournal) {
    if (!form.reason.trim()) errors.reason = "매수 이유를 적어주세요";
    if (!form.target.trim()) errors.target = "목표가를 입력해주세요";
    else if (!isFinite(targetNum) || targetNum <= 0)
      errors.target = "0보다 큰 목표가를 입력해주세요";
    else if (isFinite(priceNum) && priceNum > 0) {
      if (form.type === "매수" && targetNum <= priceNum)
        errors.target = "목표가는 매수가보다 높아야 합니다";
      if (form.type === "매도" && targetNum >= priceNum)
        errors.target = "목표가는 매도가보다 낮아야 합니다";
    }
    if (!form.stopLoss.trim()) errors.stopLoss = "손절가를 입력해주세요";
    else if (!isFinite(stopLossNum) || stopLossNum <= 0)
      errors.stopLoss = "0보다 큰 손절가를 입력해주세요";
    else if (isFinite(priceNum) && priceNum > 0) {
      if (form.type === "매수" && stopLossNum >= priceNum)
        errors.stopLoss = "손절가는 매수가보다 낮아야 합니다";
      if (form.type === "매도" && stopLossNum <= priceNum)
        errors.stopLoss = "손절가는 매도가보다 높아야 합니다";
    }
  }

  const total =
    (isFinite(sharesNum) ? sharesNum : 0) * (isFinite(priceNum) ? priceNum : 0);
  const fee = isFinite(feeNum) ? feeNum : total * 0.001;
  const isValid = Object.keys(errors).length === 0;

  const showError = (field: keyof typeof touched) =>
    touched[field] || allTouchedOnSubmit ? errors[field] : undefined;
  const [allTouchedOnSubmit, setAllTouchedOnSubmit] = useState(false);

  const handleSubmit = () => {
    if (!isValid) {
      setAllTouchedOnSubmit(true);
      const firstErr = Object.values(errors)[0];
      if (firstErr) toast.error(firstErr);
      return;
    }
    const tradeId = "t" + Date.now();
    onAdd({
      id: tradeId,
      date: form.date,
      symbol: form.symbol,
      name: selectedName || form.symbol,
      type: form.type,
      shares: sharesNum,
      price: priceNum,
      total,
      fee,
      note: form.note,
      journalLinked: form.createJournal,
    });
    if (form.createJournal && onAddJournal) {
      onAddJournal({
        id: "j" + Date.now(),
        date: form.date,
        symbol: form.symbol,
        name: selectedName || form.symbol,
        type: form.type,
        reason: form.reason.trim(),
        target: targetNum,
        stopLoss: stopLossNum,
        status: "진행중",
        tradeId,
        isMock: false,
        followUps: [],
      });
    }
    toast.success(
      form.createJournal
        ? `${form.symbol} ${form.type} 등록 · 투자일지도 작성됨`
        : `${form.symbol} ${form.type} 거래 등록 완료`,
    );
    onClose();
  };
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        />
        <div className="relative bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">
          <div className="p-5 border-b border-border flex items-center justify-between flex-shrink-0">
            <h2 className="text-base font-bold font-['Outfit']">거래 추가</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
            >
              <X size={15} />
            </button>
          </div>
          <div className="p-5 space-y-4 overflow-y-auto">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                종목 검색
              </label>
              <div className="relative">
                <Search
                  size={13}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  value={form.symbol || search}
                  onChange={(e) => {
                    if (form.symbol) {
                      setForm((f) => ({ ...f, symbol: "", price: "" }));
                      setSelectedName("");
                    }
                    setSearch(e.target.value);
                    setShowSearch(true);
                  }}
                  onFocus={() => setShowSearch(true)}
                  onBlur={() => setTouched((t) => ({ ...t, symbol: true }))}
                  placeholder="티커 또는 종목명 검색..."
                  className={cn(
                    "w-full pl-8 pr-3 py-2 text-sm bg-muted/30 border rounded-lg focus:outline-none",
                    showError("symbol")
                      ? "border-down focus:border-down"
                      : "border-border focus:border-primary",
                  )}
                />
                {showSearch &&
                  searchLoading &&
                  search.trim() &&
                  !form.symbol && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-10 px-3 py-2 text-xs text-muted-foreground">
                      검색 중...
                    </div>
                  )}
                {showSearch &&
                  !searchLoading &&
                  tradeSearchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-10 overflow-hidden">
                      {tradeSearchResults.map((s) => (
                        <button
                          key={s.ticker}
                          onClick={async () => {
                            quoteControllerRef.current?.abort();
                            const controller = new AbortController();
                            quoteControllerRef.current = controller;
                            let price = "";
                            try {
                              const quote = await fetchLatestBarQuote(
                                s.ticker,
                                {
                                  signal: controller.signal,
                                },
                              );
                              if (controller.signal.aborted) return;
                              if (quote.price > 0) price = String(quote.price);
                            } catch {
                              if (controller.signal.aborted) return;
                              /* leave price blank; user can enter manually */
                            } finally {
                              if (quoteControllerRef.current === controller) {
                                quoteControllerRef.current = null;
                              }
                            }
                            setForm((f) => ({
                              ...f,
                              symbol: s.ticker,
                              price,
                            }));
                            setSelectedName(s.name);
                            setSearch(s.ticker + " " + s.name);
                            setShowSearch(false);
                            setTouched((t) => ({ ...t, symbol: true }));
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left border-b border-border/30 last:border-0"
                        >
                          <span className="text-xs font-mono bg-muted/50 px-1.5 py-0.5 rounded text-muted-foreground w-16 text-center">
                            {s.ticker}
                          </span>
                          <span className="text-sm flex-1">{s.name}</span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {s.exchange}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                {showSearch &&
                  search.trim() &&
                  !form.symbol &&
                  tradeSearchResults.length === 0 &&
                  !searchLoading && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-10 px-3 py-2 text-xs text-muted-foreground">
                      DB 검색 결과가 없습니다
                    </div>
                  )}
              </div>
              {showError("symbol") && (
                <div className="text-[11px] text-down mt-1">
                  {showError("symbol")}
                </div>
              )}
              {form.symbol && form.type === "매도" && (
                <div className="text-[11px] text-muted-foreground mt-1">
                  현재 보유 {heldShares}주
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  거래 유형
                </label>
                <div className="flex gap-1">
                  {(["매수", "매도"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setForm((f) => ({ ...f, type: t }))}
                      className={cn(
                        "flex-1 py-2 rounded-lg text-sm font-medium transition-colors",
                        form.type === t
                          ? t === "매수"
                            ? "bg-up/20 text-up border border-up/40"
                            : "bg-down/20 text-down border border-down/40"
                          : "bg-muted/30 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  거래 날짜
                </label>
                <input
                  type="date"
                  value={form.date}
                  max={todayIso}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, date: e.target.value }))
                  }
                  onBlur={() => setTouched((t) => ({ ...t, date: true }))}
                  className={cn(
                    "w-full px-3 py-2 text-sm bg-muted/30 border rounded-lg focus:outline-none",
                    showError("date")
                      ? "border-down focus:border-down"
                      : "border-border focus:border-primary",
                  )}
                />
                {showError("date") && (
                  <div className="text-[11px] text-down mt-1">
                    {showError("date")}
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  수량
                </label>
                <input
                  type="number"
                  value={form.shares}
                  min={0}
                  step={stockIsKR ? 1 : "any"}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, shares: e.target.value }))
                  }
                  onBlur={() => setTouched((t) => ({ ...t, shares: true }))}
                  placeholder="0"
                  className={cn(
                    "w-full px-3 py-2 text-sm bg-muted/30 border rounded-lg focus:outline-none font-mono",
                    showError("shares")
                      ? "border-down focus:border-down"
                      : "border-border focus:border-primary",
                  )}
                />
                {showError("shares") && (
                  <div className="text-[11px] text-down mt-1">
                    {showError("shares")}
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  단가
                </label>
                <input
                  type="number"
                  value={form.price}
                  min={0}
                  step="any"
                  onChange={(e) =>
                    setForm((f) => ({ ...f, price: e.target.value }))
                  }
                  onBlur={() => setTouched((t) => ({ ...t, price: true }))}
                  placeholder="0"
                  className={cn(
                    "w-full px-3 py-2 text-sm bg-muted/30 border rounded-lg focus:outline-none font-mono",
                    showError("price")
                      ? "border-down focus:border-down"
                      : "border-border focus:border-primary",
                  )}
                />
                {showError("price") && (
                  <div className="text-[11px] text-down mt-1">
                    {showError("price")}
                  </div>
                )}
              </div>
            </div>
            {total > 0 && (
              <div className="bg-muted/20 rounded-lg p-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  총 거래금액
                </span>
                <span className="text-sm font-bold font-mono">
                  {fmtValue(total, form.symbol)}
                </span>
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                수수료 (기본 0.1%)
              </label>
              <input
                type="number"
                value={form.fee}
                min={0}
                step="any"
                onChange={(e) =>
                  setForm((f) => ({ ...f, fee: e.target.value }))
                }
                onBlur={() => setTouched((t) => ({ ...t, fee: true }))}
                placeholder={fee.toFixed(2)}
                className={cn(
                  "w-full px-3 py-2 text-sm bg-muted/30 border rounded-lg focus:outline-none font-mono",
                  showError("fee")
                    ? "border-down focus:border-down"
                    : "border-border focus:border-primary",
                )}
              />
              {showError("fee") && (
                <div className="text-[11px] text-down mt-1">
                  {showError("fee")}
                </div>
              )}
              <div className="text-[11px] text-muted-foreground mt-1">
                비워두면 {fee.toFixed(2)} 자동 적용
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                메모
              </label>
              <textarea
                value={form.note}
                onChange={(e) =>
                  setForm((f) => ({ ...f, note: e.target.value }))
                }
                placeholder="투자 이유, 전략 등..."
                rows={2}
                className="w-full px-3 py-2 text-sm bg-muted/30 border border-border rounded-lg focus:outline-none focus:border-primary resize-none"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.createJournal}
                onChange={(e) =>
                  setForm((f) => ({ ...f, createJournal: e.target.checked }))
                }
                className="rounded"
              />
              <span className="text-sm text-muted-foreground">
                투자일지 자동 생성
              </span>
            </label>
            {form.createJournal && (
              <div className="border border-dashed border-border rounded-lg p-3 space-y-3 bg-muted/10">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  투자일지 항목
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    {form.type === "매수" ? "매수 이유" : "매도 이유"}
                  </label>
                  <textarea
                    value={form.reason}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, reason: e.target.value }))
                    }
                    onBlur={() => setTouched((t) => ({ ...t, reason: true }))}
                    rows={3}
                    placeholder={
                      form.type === "매수"
                        ? "왜 이 가격에 샀는지 (펀더멘털·매크로·기술적 근거 등)"
                        : "왜 이 가격에 팔았는지 (목표 도달·전략 변경·손절 등)"
                    }
                    className={cn(
                      "w-full px-3 py-2 text-sm bg-card border rounded-lg focus:outline-none resize-none",
                      (touched.reason || allTouchedOnSubmit) && errors.reason
                        ? "border-down focus:border-down"
                        : "border-border focus:border-primary",
                    )}
                  />
                  {(touched.reason || allTouchedOnSubmit) && errors.reason && (
                    <div className="text-[11px] text-down mt-1">
                      {errors.reason}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      목표가
                    </label>
                    <input
                      type="number"
                      value={form.target}
                      min={0}
                      step="any"
                      onChange={(e) =>
                        setForm((f) => ({ ...f, target: e.target.value }))
                      }
                      onBlur={() => setTouched((t) => ({ ...t, target: true }))}
                      placeholder="0"
                      className={cn(
                        "w-full px-3 py-2 text-sm bg-card border rounded-lg focus:outline-none font-mono",
                        (touched.target || allTouchedOnSubmit) && errors.target
                          ? "border-down focus:border-down"
                          : "border-border focus:border-primary",
                      )}
                    />
                    {(touched.target || allTouchedOnSubmit) &&
                      errors.target && (
                        <div className="text-[11px] text-down mt-1">
                          {errors.target}
                        </div>
                      )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      손절가
                    </label>
                    <input
                      type="number"
                      value={form.stopLoss}
                      min={0}
                      step="any"
                      onChange={(e) =>
                        setForm((f) => ({ ...f, stopLoss: e.target.value }))
                      }
                      onBlur={() =>
                        setTouched((t) => ({ ...t, stopLoss: true }))
                      }
                      placeholder="0"
                      className={cn(
                        "w-full px-3 py-2 text-sm bg-card border rounded-lg focus:outline-none font-mono",
                        (touched.stopLoss || allTouchedOnSubmit) &&
                          errors.stopLoss
                          ? "border-down focus:border-down"
                          : "border-border focus:border-primary",
                      )}
                    />
                    {(touched.stopLoss || allTouchedOnSubmit) &&
                      errors.stopLoss && (
                        <div className="text-[11px] text-down mt-1">
                          {errors.stopLoss}
                        </div>
                      )}
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  목표가/손절가는 투자일지에서 한 번 더 확인할 수 있고, 알람도
                  거기서 만들 수 있어요.
                </div>
              </div>
            )}
          </div>
          <div className="px-5 py-4 border-t border-border flex gap-2 flex-shrink-0">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg bg-muted/40 text-muted-foreground text-sm hover:text-foreground"
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isValid}
              className={cn(
                "flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors",
                !isValid
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : form.type === "매수"
                    ? "bg-up text-white hover:bg-up/90"
                    : "bg-down text-white hover:bg-down/90",
              )}
            >
              {form.type} 등록
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

// ── Portfolio Tab ─────────────────────────────────────────────
function PortfolioTab() {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [tradeForTicker, setTradeForTicker] = useState<string | null>(null);
  const [trades] = useLocalState<Trade[]>("financelab_trades", []);
  const { byTicker } = useLiveStockUniverse();
  const holdings = useMemo(
    () => buildHoldingsFromTrades(trades, byTicker),
    [trades, byTicker],
  );
  const totalValueUSD = holdings.reduce(
    (s, h) => s + (h.isKR ? h.marketValue / 1300 : h.marketValue),
    0,
  );
  const totalPnlUSD = holdings.reduce(
    (s, h) => s + (h.isKR ? h.pnl / 1300 : h.pnl),
    0,
  );
  const investedUSD = totalValueUSD - totalPnlUSD;
  const totalPnlP = investedUSD > 0 ? (totalPnlUSD / investedUSD) * 100 : 0;
  const [chartPeriod, setChartPeriod] = useState<"주" | "월" | "년">("월");
  const { data: flowAnalytics, loading: flowAnalyticsLoading } =
    usePortfolioAnalytics(flowPeriodToApi(chartPeriod), "month");
  const sectorMap: Record<string, number> = {};
  holdings.forEach((h) => {
    sectorMap[h.sector] =
      (sectorMap[h.sector] ?? 0) +
      (h.isKR ? h.marketValue / 1300 : h.marketValue);
  });
  const sectorData = Object.entries(sectorMap)
    .map(([name, value]) => ({
      name,
      value,
      pct: totalValueUSD > 0 ? (value / totalValueUSD) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
  const sectorSource = `보유 ${holdings.length.toLocaleString()}개 · 현재가 기반 평가금액`;
  const apiInvestmentFlow = flowAnalytics?.investment_flow ?? [];
  const portfolioChartData = apiInvestmentFlow;
  const monthKey = new Date().toISOString().slice(0, 7);
  const monthNetInvestmentUSD = trades
    .filter((t) => t.date.startsWith(monthKey))
    .reduce((sum, t) => {
      const cash = t.type === "매수" ? t.total + t.fee : -(t.total - t.fee);
      return sum + (isKRTicker(t.symbol) ? cash / 1300 : cash);
    }, 0);
  const usHoldingCount = holdings.filter((h) => !h.isKR).length;
  const krHoldingCount = holdings.filter((h) => h.isKR).length;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "총 평가금액",
            value: fmtUSD(totalValueUSD),
            sub: `≈ ${fmtKRW(totalValueUSD * 1300)}`,
            color: "text-foreground",
          },
          {
            label: "총 수익",
            value: `${totalPnlUSD >= 0 ? "+" : ""}${fmtUSD(totalPnlUSD)}`,
            sub: `${totalPnlP >= 0 ? "+" : ""}${totalPnlP.toFixed(2)}%`,
            color: totalPnlUSD >= 0 ? "text-up" : "text-down",
          },
          {
            label: "보유 종목",
            value: `${holdings.length}개`,
            sub: `미국 ${usHoldingCount} · 국내 ${krHoldingCount}`,
            color: "text-foreground",
          },
          {
            label: "이달 순투자",
            value: fmtUSD(monthNetInvestmentUSD),
            sub: fmtKRW(monthNetInvestmentUSD * 1300),
            color:
              monthNetInvestmentUSD > 0
                ? "text-up"
                : monthNetInvestmentUSD < 0
                  ? "text-down"
                  : "text-muted-foreground",
          },
        ].map((c) => (
          <div
            key={c.label}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className="text-xs text-muted-foreground mb-2">{c.label}</div>
            <div className={cn("text-lg font-bold font-mono", c.color)}>
              {c.value}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{c.sub}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold">투자금 흐름</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                거래내역 기준 누적 순투자금 · 원화 환산
              </p>
            </div>
            <div className="flex gap-1">
              {(["주", "월", "년"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setChartPeriod(p)}
                  className={cn(
                    "text-xs px-2 py-1 rounded-lg border transition-colors",
                    chartPeriod === p
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          {flowAnalyticsLoading && portfolioChartData.length === 0 ? (
            <div className="h-24 rounded-lg bg-muted/20 animate-pulse" />
          ) : portfolioChartData.length === 0 ? (
            <div className="h-24 flex items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
              {trades.length === 0
                ? "거래내역이 생기면 API 누적 순투자금 차트가 표시됩니다"
                : "백엔드 거래내역 동기화 후 API 누적 순투자금 차트가 표시됩니다"}
            </div>
          ) : (
            <div className="space-y-2">
              <KLineSeriesChart
                data={portfolioChartData}
                settingsScope="mypage-cashflow"
                height={170}
                valueFormatter={(v) => fmtKRW(v)}
                zeroLine
                showRangeControls={false}
                allowValueTransform={false}
                fixedScaleLabel="원"
                fixedScaleDetail="API 현금흐름"
                fixedScaleTitle="/portfolios/me/analytics API가 반환한 원화 현금흐름 값을 그대로 표시"
                sourceLabel="API"
                sourceTone="primary"
                sourceTitle="/portfolios/me/analytics API 응답 기준"
                series={[
                  {
                    key: "value",
                    label: "누적 순투자금",
                    color: "var(--primary)",
                    type: "area",
                  },
                  {
                    key: "netFlow",
                    label: "기간 순유입",
                    color: "var(--violet)",
                    type: "bar",
                  },
                ]}
              />
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                <span
                  className="rounded border border-primary/35 bg-primary/10 px-1.5 py-0.5 font-mono text-primary"
                  title="/portfolios/me/analytics API 응답 기준"
                >
                  API
                </span>
                <span>백엔드 거래내역 API 기준</span>
              </div>
            </div>
          )}
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <h3 className="text-sm font-semibold">섹터 비중</h3>
            <span className="text-[10px] text-muted-foreground font-mono">
              {sectorSource}
            </span>
          </div>
          {sectorData.length === 0 ? (
            <div className="h-[137px] flex items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
              보유 종목이 생기면 섹터 비중이 표시됩니다
            </div>
          ) : (
            <div
              className="space-y-3"
              role="list"
              aria-label={`섹터 비중. ${sectorSource}. 평가금액 내림차순`}
            >
              {sectorData.map((s, i) => {
                const color = SECTOR_COLORS[i % SECTOR_COLORS.length];
                const rowLabel = `${s.name} 섹터 비중 ${fmtPct(s.pct)}, 평가금액 ${fmtUSD(
                  s.value,
                )}. ${sectorSource}`;
                return (
                  <div
                    key={s.name}
                    className="space-y-1.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    role="listitem"
                    tabIndex={0}
                    title={rowLabel}
                    aria-label={rowLabel}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ background: color }}
                        />
                        <span className="text-muted-foreground">{s.name}</span>
                      </div>
                      <span className="font-medium">{fmtPct(s.pct)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(2, s.pct)}%`,
                          background: color,
                        }}
                      />
                    </div>
                    <div className="text-[10px] text-muted-foreground text-right">
                      {fmtUSD(s.value)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold">보유 종목</h3>
          <span className="text-xs text-muted-foreground">
            클릭하면 상세 정보
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                {[
                  "종목",
                  "수량",
                  "평균단가",
                  "현재가",
                  "평가금액",
                  "수익(손실)",
                  "수익률",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {holdings.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-xs text-muted-foreground"
                  >
                    아직 보유 종목이 없습니다. 거래를 추가하면 이 표가 실제
                    거래내역 기준으로 채워집니다.
                  </td>
                </tr>
              ) : (
                holdings.map((h) => (
                  <tr
                    key={h.symbol}
                    onClick={() => setSelectedTicker(h.symbol)}
                    className="border-b border-border/50 hover:bg-muted/10 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold group-hover:text-primary transition-colors">
                        {h.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {h.symbol}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {h.shares.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      {fmtPrice(h.avgPrice, h.symbol)}
                    </td>
                    <td className="px-4 py-3 font-mono font-medium">
                      {fmtPrice(h.currentPrice, h.symbol)}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold">
                      {fmtValue(h.marketValue, h.symbol)}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 font-mono text-sm",
                        h.pnl >= 0 ? "text-up" : "text-down",
                      )}
                    >
                      {h.pnl >= 0 ? "+" : ""}
                      {fmtValue(Math.abs(h.pnl), h.symbol)}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 font-mono font-semibold",
                        h.pnlP >= 0 ? "text-up" : "text-down",
                      )}
                    >
                      {h.pnlP >= 0 ? "+" : ""}
                      {h.pnlP.toFixed(2)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {selectedTicker && (
        <StockDetailModal
          ticker={selectedTicker}
          onClose={() => setSelectedTicker(null)}
          onAddTrade={(t) => setTradeForTicker(t)}
        />
      )}
      {tradeForTicker && (
        <AddTradeModal
          prefillSymbol={tradeForTicker}
          onClose={() => setTradeForTicker(null)}
          onAdd={(t) => appendToLocalArray<Trade>("financelab_trades", t)}
          onAddJournal={(j) =>
            appendToLocalArray<Journal>("financelab_journals", j)
          }
          currentHoldings={netSharesByTrade(
            readLocalArray<Trade>("financelab_trades", []),
          )}
        />
      )}
    </div>
  );
}

// ── Watchlist Tab ─────────────────────────────────────────────
function WatchlistTab() {
  const { watchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const { byTicker, loading: stocksLoading } = useLiveStockUniverse();
  const [search, setSearch] = useState("");
  const [tradeForTicker, setTradeForTicker] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const { data: searchResults = [], loading: searchLoading } = useStockSearch(
    showSearch ? search : "",
    10,
  );
  const quoteControllerRef = useRef<AbortController | null>(null);
  const displayList = useMemo(
    () =>
      watchlist.map((item) => {
        const live = byTicker.get(item.ticker);
        return live
          ? {
              ...item,
              name: live.name,
              exchange: live.exchange,
              price: live.price,
              changePct: live.changePct,
              sector: live.sector,
            }
          : item;
      }),
    [byTicker, watchlist],
  );
  const filteredSearchResults = useMemo(
    () =>
      (searchResults ?? [])
        .filter((s) => !displayList.some((w) => w.ticker === s.ticker))
        .slice(0, 8),
    [displayList, searchResults],
  );
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowSearch(false);
    };
    document.addEventListener("mousedown", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      quoteControllerRef.current?.abort();
    };
  }, []);
  return (
    <div className="space-y-4">
      <div ref={searchRef} className="relative">
        <div className="flex-1 relative">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowSearch(true);
            }}
            onFocus={() => setShowSearch(true)}
            placeholder="종목 검색 후 추가 (티커 또는 종목명)"
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        {showSearch && searchLoading && search.trim() && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-2xl z-20 px-4 py-3 text-xs text-muted-foreground">
            검색 중...
          </div>
        )}
        {showSearch && !searchLoading && filteredSearchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-2xl z-20 overflow-hidden">
            {filteredSearchResults.map((s) => (
              <button
                key={s.ticker}
                onClick={async () => {
                  quoteControllerRef.current?.abort();
                  const controller = new AbortController();
                  quoteControllerRef.current = controller;
                  let quote = { price: 0, changePct: 0 };
                  try {
                    quote = await fetchLatestBarQuote(s.ticker, {
                      signal: controller.signal,
                    });
                    if (controller.signal.aborted) return;
                  } catch {
                    if (controller.signal.aborted) return;
                    /* keep empty quote; detail modal can still load bars */
                  } finally {
                    if (quoteControllerRef.current === controller) {
                      quoteControllerRef.current = null;
                    }
                  }
                  addToWatchlist({
                    ticker: s.ticker,
                    name: s.name,
                    exchange: s.exchange,
                    price: quote.price,
                    changePct: quote.changePct,
                    sector: "—",
                  });
                  setSearch("");
                  setShowSearch(false);
                  toast.success(`${s.ticker} 관심종목 추가`);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left border-b border-border/30 last:border-0"
              >
                <span className="text-xs font-mono bg-muted/50 px-1.5 py-0.5 rounded text-muted-foreground w-16 text-center">
                  {s.ticker}
                </span>
                <div className="flex-1">
                  <div className="text-sm font-medium">{s.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.exchange}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground font-mono">
                    {s.country}
                  </div>
                </div>
                <Plus size={14} className="text-primary flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
        {showSearch &&
          search.trim() &&
          !searchLoading &&
          filteredSearchResults.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-2xl z-20 px-4 py-3 text-xs text-muted-foreground">
              DB 검색 결과가 없습니다
            </div>
          )}
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            관심 종목{" "}
            <span className="text-muted-foreground font-normal">
              ({displayList.length})
            </span>
          </h3>
          <span className="text-xs text-muted-foreground">
            클릭하면 상세 정보
          </span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              {["종목", "현재가", "등락", "등락률", "거래소", ""].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stocksLoading &&
              displayList.length === 0 &&
              Array.from({ length: 4 }, (_, i) => (
                <tr
                  key={`watch-loading-${i}`}
                  className="border-b border-border/50"
                >
                  <td className="px-4 py-3" colSpan={6}>
                    <div className="h-8 rounded bg-muted/25 animate-pulse" />
                  </td>
                </tr>
              ))}
            {displayList.map((stock) => {
              const isKR = isKRTicker(stock.ticker);
              const changeAbs = (stock.price * Math.abs(stock.changePct)) / 100;
              return (
                <tr
                  key={stock.ticker}
                  onClick={() => setSelectedTicker(stock.ticker)}
                  className="border-b border-border/50 hover:bg-muted/10 transition-colors cursor-pointer group"
                >
                  <td className="px-4 py-3">
                    <div className="font-semibold group-hover:text-primary transition-colors">
                      {stock.name}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      {stock.ticker}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono font-medium">
                    {fmtPrice(stock.price, stock.ticker)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 font-mono text-sm",
                      stock.changePct >= 0 ? "text-up" : "text-down",
                    )}
                  >
                    {stock.changePct >= 0 ? "+" : "-"}
                    {isKR ? fmtKRW(changeAbs) : `$${changeAbs.toFixed(2)}`}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 font-mono font-semibold",
                      stock.changePct >= 0 ? "text-up" : "text-down",
                    )}
                  >
                    <span className="flex items-center gap-0.5">
                      {stock.changePct >= 0 ? (
                        <ArrowUpRight size={13} />
                      ) : (
                        <ArrowDownRight size={13} />
                      )}
                      {Math.abs(stock.changePct).toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {stock.exchange}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromWatchlist(stock.ticker);
                        toast.info(`${stock.ticker} 관심 해제`);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-all text-muted-foreground hover:text-down"
                    >
                      <X size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {!stocksLoading && displayList.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center">
                  <div className="text-sm font-medium text-foreground">
                    관심종목이 없습니다
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    위 검색창에서 DB에 등록된 종목을 추가하세요.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {selectedTicker && (
        <StockDetailModal
          ticker={selectedTicker}
          onClose={() => setSelectedTicker(null)}
          onAddTrade={(t) => setTradeForTicker(t)}
        />
      )}
      {tradeForTicker && (
        <AddTradeModal
          prefillSymbol={tradeForTicker}
          onClose={() => setTradeForTicker(null)}
          onAdd={(t) => appendToLocalArray<Trade>("financelab_trades", t)}
          onAddJournal={(j) =>
            appendToLocalArray<Journal>("financelab_journals", j)
          }
          currentHoldings={netSharesByTrade(
            readLocalArray<Trade>("financelab_trades", []),
          )}
        />
      )}
    </div>
  );
}

// ── Trades Tab ────────────────────────────────────────────────
function TradesTab() {
  const [trades, setTrades] = useLocalState<Trade[]>("financelab_trades", []);
  const { add: addTradeSynced } = useTradesBackendSync(trades, setTrades);
  const [showAddModal, setShowAddModal] = useState(false);
  const [tradeForTicker, setTradeForTicker] = useState<string | null>(null);
  const [period, setPeriod] = useState<"일" | "주" | "월" | "년">("월");
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const { data: tradeAnalytics, loading: tradeAnalyticsLoading } =
    usePortfolioAnalytics("month", pnlPeriodToApi(period));
  const apiRealizedPnl = tradeAnalytics?.realized_pnl ?? [];
  const profitData = apiRealizedPnl;
  const totalRealizedPnl =
    profitData.length > 0 ? profitData[profitData.length - 1].cumPnl : 0;
  const totalBuy = tradeAnalytics?.total_buy ?? 0;
  const totalSell = tradeAnalytics?.total_sell ?? 0;
  const totalFee = tradeAnalytics?.total_fee ?? 0;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-3">
        {[
          {
            label: "실현손익 누적",
            value: `${totalRealizedPnl >= 0 ? "+" : ""}${fmtUSD(totalRealizedPnl)}`,
            sub: `${totalRealizedPnl >= 0 ? "+" : ""}${fmtKRW(totalRealizedPnl * 1300)}`,
            color: totalRealizedPnl >= 0 ? "text-up" : "text-down",
          },
          {
            label: "종 매수금액",
            value: fmtKRW(totalBuy),
            sub: fmtUSD(totalBuy / 1300),
            color: "text-foreground",
          },
          {
            label: "종 매도금액",
            value: fmtKRW(totalSell),
            sub: fmtUSD(totalSell / 1300),
            color: "text-foreground",
          },
          {
            label: "종 수수료",
            value: fmtKRW(totalFee),
            sub: fmtUSD(totalFee / 1300),
            color: "text-muted-foreground",
          },
        ].map((c) => (
          <div
            key={c.label}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className="text-xs text-muted-foreground mb-1">{c.label}</div>
            <div className={cn("text-base font-bold font-mono", c.color)}>
              {c.value}
            </div>
            <div className="text-xs text-muted-foreground">{c.sub}</div>
          </div>
        ))}
      </div>
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold">실현손익 누적 추이</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              현재 기준 과거{" "}
              {period === "일"
                ? "14일"
                : period === "주"
                  ? "12주"
                  : period === "월"
                    ? "12개월"
                    : "5년"}
            </p>
          </div>
          <div className="flex gap-1">
            {(["일", "주", "월", "년"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-lg transition-colors",
                  period === p
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground",
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        {tradeAnalyticsLoading && profitData.length === 0 ? (
          <div className="h-[160px] rounded-lg bg-muted/20 animate-pulse" />
        ) : profitData.length === 0 ? (
          <div className="h-[160px] flex items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
            {trades.length === 0
              ? "거래내역이 생기면 API 실현손익 누적 추이가 표시됩니다"
              : "백엔드 거래내역 동기화 후 API 실현손익 누적 추이가 표시됩니다"}
          </div>
        ) : (
          <>
            <KLineSeriesChart
              data={profitData}
              settingsScope="mypage-realized-pnl"
              height={190}
              valueFormatter={(v) =>
                v === 0
                  ? "0"
                  : v > 0
                    ? `+$${(v / 1000).toFixed(1)}K`
                    : `-$${(Math.abs(v) / 1000).toFixed(1)}K`
              }
              zeroLine
              showRangeControls={false}
              allowValueTransform={false}
              fixedScaleLabel="$"
              fixedScaleDetail="API 실현손익"
              fixedScaleTitle="/portfolios/me/analytics API가 반환한 실현손익 값을 그대로 표시"
              sourceLabel="API"
              sourceTone="primary"
              sourceTitle="/portfolios/me/analytics API 응답 기준"
              series={[
                {
                  key: "cumPnl",
                  label: "누적 실현손익",
                  color: totalRealizedPnl >= 0 ? "#10b981" : "#ef4444",
                  type: "area",
                },
                {
                  key: "pnl",
                  label: "기간 손익",
                  color: "#6366f1",
                  type: "bar",
                },
              ]}
            />
            <div className="flex items-center gap-4 mt-2 justify-end">
              <div className="mr-auto flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                <span
                  className="rounded border border-primary/35 bg-primary/10 px-1.5 py-0.5 font-mono text-primary"
                  title="/portfolios/me/analytics API 응답 기준"
                >
                  API
                </span>
                <span>백엔드 거래내역 API 기준</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div
                  className="w-4 h-0.5 rounded"
                  style={{
                    background: totalRealizedPnl >= 0 ? "#10b981" : "#ef4444",
                  }}
                />{" "}
                누적 실현손익
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div
                  className="w-4 h-0.5 rounded"
                  style={{
                    background: "#6366f1",
                    borderTop: "2px dashed #6366f1",
                  }}
                />{" "}
                기간별 실현손익
              </div>
            </div>
          </>
        )}
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            거래 내역{" "}
            <span className="text-muted-foreground font-normal">
              ({trades.length}건)
            </span>
          </h3>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Plus size={12} /> 거래 추가
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                {[
                  "날짜",
                  "종목",
                  "유형",
                  "수량",
                  "단가",
                  "총액",
                  "수수료",
                  "메모",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trades.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-xs text-muted-foreground"
                  >
                    아직 거래 내역이 없습니다. 거래를 추가하면 실현손익과
                    포트폴리오 차트가 실제 거래 기준으로 채워집니다.
                  </td>
                </tr>
              ) : (
                trades.map((trade) => (
                  <tr
                    key={trade.id}
                    onClick={() => setSelectedTicker(trade.symbol)}
                    className="border-b border-border/50 hover:bg-muted/10 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                      {trade.date}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold group-hover:text-primary transition-colors">
                        {trade.symbol}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {trade.name}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "text-xs px-1.5 py-0.5 rounded border font-semibold",
                          trade.type === "매수"
                            ? "border-up/40 text-up bg-up/10"
                            : "border-down/40 text-down bg-down/10",
                        )}
                      >
                        {trade.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {trade.shares.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      {fmtPrice(trade.price, trade.symbol)}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold">
                      {fmtValue(trade.total, trade.symbol)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {fmtValue(trade.fee, trade.symbol)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[120px] truncate">
                      {trade.note}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {showAddModal && (
        <AddTradeModal
          onClose={() => setShowAddModal(false)}
          onAdd={(t) => addTradeSynced(t)}
          onAddJournal={(j) =>
            appendToLocalArray<Journal>("financelab_journals", j)
          }
          currentHoldings={netSharesByTrade(trades)}
        />
      )}
      {selectedTicker && (
        <StockDetailModal
          ticker={selectedTicker}
          onClose={() => setSelectedTicker(null)}
          onAddTrade={(t) => setTradeForTicker(t)}
        />
      )}
      {tradeForTicker && (
        <AddTradeModal
          prefillSymbol={tradeForTicker}
          onClose={() => setTradeForTicker(null)}
          onAdd={(t) => addTradeSynced(t)}
          onAddJournal={(j) =>
            appendToLocalArray<Journal>("financelab_journals", j)
          }
          currentHoldings={netSharesByTrade(trades)}
        />
      )}
    </div>
  );
}

// ── Journal Tab ───────────────────────────────────────────────
function JournalTab() {
  const [journals, setJournals] = useLocalState<Journal[]>(
    "financelab_journals",
    INIT_JOURNALS,
  );
  const [trades] = useLocalState<Trade[]>("financelab_trades", []);
  const { upsert: upsertJournalSynced } = useJournalsBackendSync(
    journals,
    setJournals,
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");
  const unlinkedTrades = trades.filter((t) => !t.journalLinked);
  const addFollowUp = (journalId: string) => {
    if (!newNote.trim()) return;
    const updated = journals.find((j) => j.id === journalId);
    if (!updated) return;
    const next: Journal = {
      ...updated,
      followUps: [
        ...updated.followUps,
        { date: new Date().toISOString().slice(0, 10), note: newNote },
      ],
    };
    upsertJournalSynced(next);
    setNewNote("");
    toast.success("후속 메모 추가");
  };
  return (
    <div className="space-y-4">
      {unlinkedTrades.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle
            size={15}
            className="text-amber-400 flex-shrink-0 mt-0.5"
          />
          <div>
            <div className="text-sm font-semibold text-amber-400 mb-1">
              거래내역 미연동 {unlinkedTrades.length}건 — 모의투자로 처리
            </div>
            <div className="text-xs text-muted-foreground">
              {unlinkedTrades.map((t) => `${t.symbol} (${t.type})`).join(", ")}{" "}
              — 투자일지가 없습니다.
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          거래 기반 투자 일지 · 후속 메모 관리
        </p>
        <button
          onClick={() =>
            toast.info("거래 추가 시 자동 생성 옵션을 사용하세요.")
          }
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90"
        >
          <Plus size={12} /> 일지 작성
        </button>
      </div>
      <div className="space-y-3">
        {journals.map((j) => (
          <div
            key={j.id}
            className={cn(
              "bg-card border rounded-xl overflow-hidden",
              j.isMock ? "border-amber-500/30" : "border-border",
            )}
          >
            <div
              className="p-4 cursor-pointer"
              onClick={() => setExpandedId(expandedId === j.id ? null : j.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-xs font-mono text-muted-foreground">
                      {j.date}
                    </span>
                    <span className="font-semibold">{j.symbol}</span>
                    <span className="text-xs text-muted-foreground">
                      {j.name}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded border font-semibold",
                        j.type === "매수"
                          ? "border-up/40 text-up bg-up/10"
                          : "border-down/40 text-down bg-down/10",
                      )}
                    >
                      {j.type}
                    </span>
                    {j.isMock && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded border border-amber-500/40 text-amber-400 bg-amber-500/10 font-semibold">
                        모의투자
                      </span>
                    )}
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded border",
                        j.status === "진행중"
                          ? "border-primary/40 text-primary bg-primary/10"
                          : j.status === "완료"
                            ? "border-up/40 text-up bg-up/10"
                            : "border-down/40 text-down bg-down/10",
                      )}
                    >
                      {j.status}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/80 line-clamp-2">
                    {j.reason}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">목표가</div>
                    <div className="text-sm font-mono font-semibold text-up">
                      {fmtPrice(j.target, j.symbol)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">손절가</div>
                    <div className="text-sm font-mono font-semibold text-down">
                      {fmtPrice(j.stopLoss, j.symbol)}
                    </div>
                  </div>
                  {expandedId === j.id ? (
                    <ChevronUp size={14} className="text-muted-foreground" />
                  ) : (
                    <ChevronDown size={14} className="text-muted-foreground" />
                  )}
                </div>
              </div>
            </div>
            {expandedId === j.id && (
              <div className="border-t border-border/50 p-4 space-y-3">
                {/* Quick alert creation from the journal's target/stop-loss.
                    Alerts persist into financelab_alerts; AlertsTab picks
                    them up on its next mount. Clicking twice creates two
                    rows — we leave dedupe up to the user for now since
                    they may genuinely want multiple. */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                    알람 만들기
                  </h4>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        appendToLocalArray<AlertItem>("financelab_alerts", {
                          id: "a" + Date.now(),
                          symbol: j.symbol,
                          name: j.name,
                          type: "목표가 도달",
                          condition: `≥ ${fmtPrice(j.target, j.symbol)}`,
                          status: "활성",
                          created: new Date().toISOString().slice(0, 10),
                          journalId: j.id,
                        });
                        toast.success(
                          `${j.symbol} 목표가 ${fmtPrice(j.target, j.symbol)} 알람 등록`,
                        );
                      }}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-up/40 bg-up/10 text-up hover:bg-up/15"
                    >
                      <TrendingUp size={11} /> 목표가 알람 (
                      {fmtPrice(j.target, j.symbol)})
                    </button>
                    <button
                      onClick={() => {
                        appendToLocalArray<AlertItem>("financelab_alerts", {
                          id: "a" + Date.now(),
                          symbol: j.symbol,
                          name: j.name,
                          type: "손절 라인",
                          condition: `≤ ${fmtPrice(j.stopLoss, j.symbol)}`,
                          status: "활성",
                          created: new Date().toISOString().slice(0, 10),
                          journalId: j.id,
                        });
                        toast.success(
                          `${j.symbol} 손절가 ${fmtPrice(j.stopLoss, j.symbol)} 알람 등록`,
                        );
                      }}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-down/40 bg-down/10 text-down hover:bg-down/15"
                    >
                      <TrendingDown size={11} /> 손절가 알람 (
                      {fmtPrice(j.stopLoss, j.symbol)})
                    </button>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1.5">
                    알람은 [알람 설정] 탭에서 관리할 수 있어요.
                  </div>
                </div>
                {j.followUps.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                      후속 메모
                    </h4>
                    <div className="space-y-2">
                      {j.followUps.map((fu, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-xs text-muted-foreground font-mono flex-shrink-0 mt-0.5">
                            {fu.date}
                          </span>
                          <span className="text-foreground/80">{fu.note}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="후속 메모 추가..."
                    onKeyDown={(e) => e.key === "Enter" && addFollowUp(j.id)}
                    className="flex-1 px-3 py-2 text-sm bg-muted/30 border border-border rounded-lg focus:outline-none focus:border-primary"
                  />
                  <button
                    onClick={() => addFollowUp(j.id)}
                    className="px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs hover:bg-primary/20"
                  >
                    추가
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Alerts Tab ────────────────────────────────────────────────
function AlertsTab() {
  const [alerts, setAlerts] = useLocalState<AlertItem[]>(
    "financelab_alerts",
    INIT_ALERTS,
  );
  const [journals] = useLocalState<Journal[]>(
    "financelab_journals",
    INIT_JOURNALS,
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    symbol: "",
    name: "",
    type: "목표가 도달" as AlertItem["type"],
    condition: "",
  });
  const { add: addAlertSynced, remove: removeAlertSynced } =
    useAlertsBackendSync(alerts, setAlerts);
  const handleAdd = () => {
    if (!form.symbol || !form.condition) {
      toast.error("종목과 조건을 입력하세요.");
      return;
    }
    addAlertSynced({
      id: "a" + Date.now(),
      symbol: form.symbol,
      name: form.name || form.symbol,
      type: form.type,
      condition: form.condition,
      status: "활성",
      created: new Date().toISOString().slice(0, 10),
    });
    toast.success(`${form.symbol} 알람 등록`);
    setShowAddModal(false);
    setForm({ symbol: "", name: "", type: "목표가 도달", condition: "" });
  };
  const TYPE_ICONS: Record<AlertItem["type"], React.ReactNode> = {
    "목표가 도달": <TrendingUp size={13} className="text-up" />,
    "손절 라인": <TrendingDown size={13} className="text-down" />,
    "거래량 급증": <Activity size={13} className="text-amber-400" />,
    "뉴스 알림": <FileText size={13} className="text-blue-400" />,
  };
  const activeJournals = journals.filter((j) => j.status === "진행중");
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          종목 알람 설정 · 투자일지 기반 자동 등록
        </p>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90"
        >
          <Plus size={12} /> 알람 추가
        </button>
      </div>
      {activeJournals.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
          <div className="text-xs font-semibold text-primary mb-2">
            💡 투자일지 기반 알람 추천
          </div>
          <div className="space-y-1.5">
            {activeJournals.map((j) => (
              <div
                key={j.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">
                  {j.symbol} — 목표 {fmtPrice(j.target, j.symbol)} / 손절{" "}
                  {fmtPrice(j.stopLoss, j.symbol)}
                </span>
                <button
                  onClick={() => {
                    const now = new Date().toISOString().slice(0, 10);
                    addAlertSynced({
                      id: "a" + Date.now(),
                      symbol: j.symbol,
                      name: j.name,
                      type: "목표가 도달",
                      condition: `≥ ${fmtPrice(j.target, j.symbol)}`,
                      status: "활성",
                      created: now,
                      journalId: j.id,
                    });
                    addAlertSynced({
                      id: "a" + (Date.now() + 1),
                      symbol: j.symbol,
                      name: j.name,
                      type: "손절 라인",
                      condition: `≤ ${fmtPrice(j.stopLoss, j.symbol)}`,
                      status: "활성",
                      created: now,
                      journalId: j.id,
                    });
                    toast.success(`${j.symbol} 알람 2개 등록`);
                  }}
                  className="text-xs text-primary hover:underline flex-shrink-0 ml-2"
                >
                  등록
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="space-y-2">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={cn(
              "bg-card border border-border rounded-xl p-4 flex items-center gap-4",
              alert.status === "완료" && "opacity-60",
            )}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted/30 flex-shrink-0">
              {TYPE_ICONS[alert.type]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-semibold text-sm">{alert.symbol}</span>
                <span className="text-xs text-muted-foreground">
                  {alert.name}
                </span>
                {alert.journalId && (
                  <span className="text-[10px] px-1 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    일지 연동
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {alert.type} · {alert.condition}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded border",
                  alert.status === "활성"
                    ? "border-up/40 text-up bg-up/10"
                    : "border-muted text-muted-foreground bg-muted/20",
                )}
              >
                {alert.status}
              </span>
              <button
                onClick={() => {
                  removeAlertSynced(alert.id);
                  toast.info("알람 삭제");
                }}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-down"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
      {showAddModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setShowAddModal(false)}
            />
            <div className="relative bg-card border border-border rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4">
              <h2 className="text-base font-bold">알람 추가</h2>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  종목 티커
                </label>
                <input
                  value={form.symbol}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      symbol: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="NVDA, 005930..."
                  className="w-full px-3 py-2 text-sm bg-muted/30 border border-border rounded-lg focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  알람 유형
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      "목표가 도달",
                      "손절 라인",
                      "거래량 급증",
                      "뉴스 알림",
                    ] as const
                  ).map((t) => (
                    <button
                      key={t}
                      onClick={() => setForm((f) => ({ ...f, type: t }))}
                      className={cn(
                        "text-xs px-2 py-1.5 rounded-lg border transition-colors",
                        form.type === t
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  조건
                </label>
                <input
                  value={form.condition}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, condition: e.target.value }))
                  }
                  placeholder="≥ $1,000 또는 ≤ ₩70,000..."
                  className="w-full px-3 py-2 text-sm bg-muted/30 border border-border rounded-lg focus:outline-none focus:border-primary"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 rounded-lg bg-muted/40 text-sm text-muted-foreground"
                >
                  취소
                </button>
                <button
                  onClick={handleAdd}
                  className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
                >
                  등록
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}

// ── Bookmarks Tab (팔로우/북마크 통합) ───────────────────────
// Hydrates a backend-stored bookmark with a title pulled from the mock
// data arrays, so old bookmarks (saved before the v2 schema stored
// title/subtitle inline) still render with something meaningful.
function hydrateBookmark(item: BookmarkItem): {
  title: string;
  subtitle?: string;
  href?: string;
} {
  if (item.title)
    return { title: item.title, subtitle: item.subtitle, href: item.href };
  if (item.type === "report") {
    const r = REPORTS.find((x) => x.id === item.id);
    if (r)
      return {
        title: r.title,
        subtitle: `${r.institution} · ${r.date}`,
        href: `/reports`,
      };
  } else if (item.type === "guide") {
    const g = LEARN_GUIDES?.find((x) => x.id === item.id);
    if (g) return { title: g.title, href: `/learn/${item.id}` };
  } else if (item.type === "master") {
    const m = MASTERS.find((x) => x.id === item.id);
    if (m)
      return {
        title: (m as any).nameKo ?? m.name,
        subtitle: m.fund,
        href: `/masters/${item.id}`,
      };
  } else if (item.type === "stock") {
    return {
      title: item.id,
      subtitle: "종목",
      href: `/stocks/${item.id}`,
    };
  } else if (item.type === "news") {
    return { title: `뉴스 #${item.id}`, href: `/news` };
  }
  return { title: item.id };
}

const BOOKMARK_TYPE_META: Record<
  BookmarkType,
  { label: string; icon: React.ReactNode; tint: string }
> = {
  news: { label: "뉴스", icon: <Newspaper size={13} />, tint: "text-sky-400" },
  report: {
    label: "리포트",
    icon: <FileText size={13} />,
    tint: "text-blue-400",
  },
  guide: {
    label: "학습",
    icon: <GraduationCap size={13} />,
    tint: "text-violet-400",
  },
  master: { label: "거장", icon: <Users size={13} />, tint: "text-amber-400" },
  stock: {
    label: "종목",
    icon: <BarChart3 size={13} />,
    tint: "text-emerald-400",
  },
};

function BookmarksTab() {
  const bookmarkCtx = useContext(BookmarkContext);
  const followCtx = useContext(FollowContext);
  const items = bookmarkCtx?.bookmarkedItems ?? [];

  // The "거장" chip layers followed masters on top of bookmarked ones —
  // those count as the same kind of interest from the user's POV.
  const followedMasterIds: string[] = followCtx?.followedIds
    ? Array.from(followCtx.followedIds)
    : [];
  const followedExtra: BookmarkItem[] = followedMasterIds
    .filter((id) => !items.some((it) => it.type === "master" && it.id === id))
    .map((id) => {
      const m = MASTERS.find((x) => x.id === id);
      return {
        type: "master" as const,
        id,
        title: m ? ((m as any).nameKo ?? m.name) : id,
        subtitle: m ? `${m.fund} · 팔로우` : "팔로우",
        href: `/masters/${id}`,
        added_at: 0, // sentinel: follows live at the bottom of the list
      };
    });
  const allItems = [...items, ...followedExtra].sort(
    (a, b) => b.added_at - a.added_at,
  );

  const counts: Record<BookmarkType | "all", number> = {
    all: allItems.length,
    news: allItems.filter((i) => i.type === "news").length,
    report: allItems.filter((i) => i.type === "report").length,
    guide: allItems.filter((i) => i.type === "guide").length,
    master: allItems.filter((i) => i.type === "master").length,
    stock: allItems.filter((i) => i.type === "stock").length,
  };
  const [filter, setFilter] = useState<BookmarkType | "all">("all");

  const visible =
    filter === "all" ? allItems : allItems.filter((i) => i.type === filter);

  const handleRemove = (item: BookmarkItem) => {
    if (
      item.type === "master" &&
      followedMasterIds.includes(item.id) &&
      !bookmarkCtx?.isBookmarked("master", item.id)
    ) {
      // Follow-only entry — drop the follow rather than the bookmark.
      followCtx?.unfollow?.(item.id);
      toast.info("팔로우 해제");
      return;
    }
    bookmarkCtx?.removeBookmark(item.type, item.id);
    if (item.type === "master" && followedMasterIds.includes(item.id)) {
      followCtx?.unfollow?.(item.id);
    }
    toast.info("북마크 해제");
  };

  const FILTERS: { key: BookmarkType | "all"; label: string }[] = [
    { key: "all", label: "전체" },
    { key: "news", label: "뉴스" },
    { key: "report", label: "리포트" },
    { key: "guide", label: "학습" },
    { key: "master", label: "거장" },
    { key: "stock", label: "종목" },
  ];

  return (
    <div className="space-y-4">
      {/* Filter chips */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const c = counts[f.key];
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5",
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-mono",
                  active ? "bg-primary-foreground/20" : "bg-muted/60",
                )}
              >
                {c}
              </span>
            </button>
          );
        })}
      </div>

      {/* Unified scrollable list */}
      <div className="bg-card border border-border rounded-xl divide-y divide-border">
        {visible.length === 0 ? (
          <div className="text-center py-12">
            <Bookmark
              size={28}
              className="mx-auto mb-2 text-muted-foreground/40"
            />
            <p className="text-sm text-muted-foreground">
              {filter === "all"
                ? "아직 북마크한 항목이 없어요"
                : `${BOOKMARK_TYPE_META[filter].label} 북마크가 없습니다`}
            </p>
          </div>
        ) : (
          visible.map((item) => {
            const meta = hydrateBookmark(item);
            const typeMeta = BOOKMARK_TYPE_META[item.type];
            const followed =
              item.type === "master" && followedMasterIds.includes(item.id);
            const bookmarked = bookmarkCtx?.isBookmarked(item.type, item.id);
            return (
              <div
                key={`${item.type}-${item.id}`}
                className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors"
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg bg-muted/40 flex items-center justify-center flex-shrink-0",
                    typeMeta.tint,
                  )}
                >
                  {typeMeta.icon}
                </div>
                <div className="flex-1 min-w-0">
                  {meta.href ? (
                    <Link href={meta.href}>
                      <div className="text-sm font-medium truncate hover:text-primary cursor-pointer">
                        {meta.title}
                      </div>
                    </Link>
                  ) : (
                    <div className="text-sm font-medium truncate">
                      {meta.title}
                    </div>
                  )}
                  {meta.subtitle && (
                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      {meta.subtitle}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded border bg-muted/40",
                      typeMeta.tint,
                    )}
                  >
                    {typeMeta.label}
                  </span>
                  {followed && bookmarked && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      팔로우
                    </span>
                  )}
                  {followed && !bookmarked && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      팔로우
                    </span>
                  )}
                  <button
                    onClick={() => handleRemove(item)}
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-down transition-colors"
                    title="제거"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────
const MY_TABS = [
  { label: "포트폴리오", icon: <LayoutDashboard size={13} /> },
  { label: "관심종목", icon: <Star size={13} /> },
  { label: "거래내역", icon: <ClipboardList size={13} /> },
  { label: "투자일지", icon: <BookOpen size={13} /> },
  { label: "알람 설정", icon: <Bell size={13} /> },
  { label: "북마크", icon: <Bookmark size={13} /> },
];

// Maps `?tab=…` query values to the MY_TABS index, so header / cross-page
// links can deep-link straight into a tab (e.g. the bookmark shortcut in
// the global header sends `/mypage?tab=bookmarks`).
const TAB_QUERY_INDEX: Record<string, number> = {
  portfolio: 0,
  watchlist: 1,
  trades: 2,
  journal: 3,
  alerts: 4,
  bookmarks: 5,
};

function initialTabFromUrl(): number {
  if (typeof window === "undefined") return 0;
  const q = new URLSearchParams(window.location.search).get("tab");
  if (!q) return 0;
  return TAB_QUERY_INDEX[q.toLowerCase()] ?? 0;
}

// ── Main ─────────────────────────────────────────────────────
export default function MyPage() {
  const [activeTab, setActiveTab] = useState<number>(() => initialTabFromUrl());
  const TAB_CONTENT = [
    <PortfolioTab />,
    <WatchlistTab />,
    <TradesTab />,
    <JournalTab />,
    <AlertsTab />,
    <BookmarksTab />,
  ];
  return (
    <div className="space-y-5 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold font-['Outfit']">마이페이지</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          포트폴리오 · 관심종목 · 거래내역 · 투자일지 · 알람
        </p>
      </div>
      <div className="flex gap-1 bg-muted/40 p-1 rounded-xl overflow-x-auto">
        {MY_TABS.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActiveTab(i)}
            className={cn(
              "flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg transition-all duration-200 whitespace-nowrap font-medium",
              activeTab === i
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>
      {TAB_CONTENT[activeTab]}
    </div>
  );
}
