import { Link } from "react-router-dom";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { Badge } from "../../../components/primitives/Badge";
import { Card } from "../../../components/primitives/Card";
import { Skeleton } from "../../../components/primitives/Skeleton";
import type { Watchlist, WatchlistItem } from "../../../lib/api-client";
import { useAuth } from "../../../lib/auth-state";
import type { WatchlistState } from "../../../lib/useWatchlist";
import styles from "./WatchlistCard.module.css";

const DASH = "—";

type LocalItem = {
  symbol: string;
  addedAt: string;
};

function hiddenKey(userId: string): string {
  return `finance-lab:watchlist:hidden:${userId}`;
}

function addedKey(userId: string): string {
  return `finance-lab:watchlist:added:${userId}`;
}

function readArray(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === "string");
  } catch {
    return [];
  }
}

function readLocalItems(userId: string): LocalItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(addedKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => {
        if (typeof entry === "string") {
          return { symbol: entry, addedAt: new Date().toISOString() } satisfies LocalItem;
        }
        if (
          entry &&
          typeof entry === "object" &&
          typeof (entry as LocalItem).symbol === "string"
        ) {
          return {
            symbol: (entry as LocalItem).symbol,
            addedAt: (entry as LocalItem).addedAt ?? new Date().toISOString(),
          };
        }
        return null;
      })
      .filter((entry): entry is LocalItem => entry !== null);
  } catch {
    return [];
  }
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ItemRow({
  item,
  onRemove,
  localBadge,
  lastUpdated,
}: {
  item: WatchlistItem;
  onRemove?: () => void;
  localBadge?: boolean;
  lastUpdated?: string;
}) {
  return (
    <div className={styles.row}>
      <Link className={styles.symbol} to={`/stocks/${encodeURIComponent(item.symbol)}`}>
        <span className={styles.symbolCode}>{item.symbol}</span>
        <span className={styles.symbolName}>
          {item.name}
          {localBadge ? (
            <>
              {" "}
              <Badge tone="neutral">로컬</Badge>
            </>
          ) : null}
        </span>
      </Link>
      <span className={styles.cellPrice}>
        {item.last_price != null ? item.last_price.toFixed(2) : DASH}
      </span>
      <span className={styles.cellPrice}>{DASH}</span>
      <span className={styles.maNeutral}>{DASH}</span>
      <div className={styles.rsiNeutral}>
        <span className={styles.rsiValue}>{DASH}</span>
      </div>
      <span className={styles.cellMemo}>
        {item.note ? (
          <span className={styles.memoHasCount}>✎</span>
        ) : (
          <span className={styles.memoAdd}>+ 메모</span>
        )}
      </span>
      <span className={styles.cellEvent}>{lastUpdated ?? DASH}</span>
      {onRemove ? (
        <button
          type="button"
          className={styles.removeButton}
          aria-label={`${item.symbol} 관심종목에서 제거`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRemove();
          }}
        >
          <X size={12} aria-hidden="true" strokeWidth={2} />
        </button>
      ) : null}
    </div>
  );
}

function ReadyCard({
  watchlist,
  userId,
}: {
  watchlist: Watchlist;
  userId: string;
}) {
  const [hidden, setHidden] = useState<string[]>(() => readArray(hiddenKey(userId)));
  const [added, setAdded] = useState<LocalItem[]>(() => readLocalItems(userId));
  const [trackedUserId, setTrackedUserId] = useState(userId);
  const [newSymbol, setNewSymbol] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (trackedUserId !== userId) {
    setTrackedUserId(userId);
    setHidden(readArray(hiddenKey(userId)));
    setAdded(readLocalItems(userId));
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(hiddenKey(userId), JSON.stringify(hidden));
  }, [hidden, userId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(addedKey(userId), JSON.stringify(added));
  }, [added, userId]);

  const hiddenSet = useMemo(() => new Set(hidden), [hidden]);
  const visibleItems = useMemo(
    () => watchlist.items.filter((item) => !hiddenSet.has(item.symbol)),
    [hiddenSet, watchlist.items],
  );

  function handleRemove(symbol: string) {
    setHidden((current) => (current.includes(symbol) ? current : [...current, symbol]));
  }

  function handleRemoveLocal(symbol: string) {
    setAdded((current) => current.filter((entry) => entry.symbol !== symbol));
  }

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const symbol = newSymbol.trim().toUpperCase();
    if (!symbol) {
      setError("종목 심볼을 입력해 주세요.");
      return;
    }
    const exists =
      watchlist.items.some((item) => item.symbol === symbol) ||
      added.some((entry) => entry.symbol === symbol);
    if (exists) {
      setError("이미 관심종목 목록에 있습니다.");
      return;
    }
    setAdded((current) => [
      { symbol, addedAt: new Date().toISOString() },
      ...current,
    ]);
    setNewSymbol("");
    setError(null);
    setAdding(false);
  }

  const totalCount = visibleItems.length + added.length;

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>관심종목</h2>
          <span className={styles.count}>{totalCount}개</span>
        </div>
        <span className={styles.legend}>
          업데이트 {formatUpdatedAt(watchlist.updated_at)}
        </span>
      </div>
      {totalCount === 0 ? (
        <div className={styles.statusBody}>아직 관심종목이 없습니다.</div>
      ) : (
        <>
          <div className={styles.tableHead}>
            <div className={[styles.thGrow, styles.thSymbol].join(" ")}>종목</div>
            <div className={[styles.thFixed, styles.thPrice].join(" ")}>현재가</div>
            <div className={[styles.thFixed, styles.thChange].join(" ")}>오늘</div>
            <div className={[styles.thFixed, styles.thMa].join(" ")}>MA</div>
            <div className={[styles.thFixed, styles.thRsi].join(" ")}>RSI</div>
            <div className={[styles.thFixed, styles.thMemo].join(" ")}>메모</div>
            <div className={[styles.thFixed, styles.thEvent].join(" ")}>다음 이벤트</div>
            <div className={styles.thRemove} aria-hidden="true" />
          </div>
          {added.map((entry) => (
            <ItemRow
              key={`local:${entry.symbol}`}
              item={{
                symbol: entry.symbol,
                name: entry.symbol,
                exchange: "—",
                currency: "USD",
                last_price: null,
                last_price_at: null,
                note: null,
              }}
              onRemove={() => handleRemoveLocal(entry.symbol)}
              localBadge
              lastUpdated="방금 추가"
            />
          ))}
          {visibleItems.map((item) => (
            <ItemRow
              key={`${item.exchange}:${item.symbol}`}
              item={item}
              onRemove={() => handleRemove(item.symbol)}
            />
          ))}
        </>
      )}
      <div className={styles.addRow}>
        {adding ? (
          <form className={styles.addForm} onSubmit={handleAdd}>
            <input
              type="text"
              className={styles.addInput}
              placeholder="종목 심볼 (예: AAPL)"
              value={newSymbol}
              onChange={(event) => setNewSymbol(event.target.value)}
              autoFocus
              spellCheck={false}
              autoComplete="off"
              aria-label="추가할 종목 심볼"
            />
            <button type="submit" className={styles.addSubmit}>
              추가
            </button>
            <button
              type="button"
              className={styles.addCancel}
              onClick={() => {
                setAdding(false);
                setNewSymbol("");
                setError(null);
              }}
            >
              취소
            </button>
          </form>
        ) : (
          <button
            type="button"
            className={styles.addButton}
            onClick={() => setAdding(true)}
          >
            + 종목 추가
          </button>
        )}
        {error ? <p className={styles.addError}>{error}</p> : null}
      </div>
    </Card>
  );
}

function StatusCard({ children }: { children: React.ReactNode }) {
  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>관심종목</h2>
        </div>
      </div>
      <div className={styles.statusBody}>{children}</div>
    </Card>
  );
}

export function WatchlistCard({ state }: { state: WatchlistState }) {
  const auth = useAuth();
  const [signInError, setSignInError] = useState<string | null>(null);

  async function handleSignIn() {
    setSignInError(null);
    try {
      await auth.signInWithGoogle(window.location.href);
    } catch (error) {
      setSignInError(
        error instanceof Error ? error.message : "로그인을 시작하지 못했습니다.",
      );
    }
  }

  if (state.status === "signed-out") {
    return (
      <StatusCard>
        <div className={styles.signInPrompt}>
          <span>로그인하면 내 관심종목과 메모를 볼 수 있습니다.</span>
          <button
            type="button"
            className={styles.signInButton}
            onClick={() => void handleSignIn()}
          >
            로그인
          </button>
        </div>
        {signInError ? <p className={styles.error}>{signInError}</p> : null}
      </StatusCard>
    );
  }
  if (state.status === "config-error") {
    return <StatusCard>Supabase 브라우저 설정이 필요합니다.</StatusCard>;
  }
  if (state.status === "loading") {
    return (
      <StatusCard>
        <div className={styles.skeletonStack} aria-hidden="true">
          <Skeleton variant="title" />
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
      </StatusCard>
    );
  }
  if (state.status === "error") {
    return <StatusCard>관심종목을 불러오지 못했습니다. ({state.message})</StatusCard>;
  }
  if (auth.status !== "signed-in") {
    return <StatusCard>관심종목을 불러오지 못했습니다.</StatusCard>;
  }
  return <ReadyCard watchlist={state.watchlist} userId={auth.user.id} />;
}
