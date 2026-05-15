import { Link } from "react-router-dom";
import { Card } from "../../../components/primitives/Card";
import type { Watchlist, WatchlistItem } from "../../../lib/api-client";
import { useAuth } from "../../../lib/auth-state";
import type { WatchlistState } from "../../../lib/useWatchlist";
import styles from "./WatchlistCard.module.css";

const DASH = "—";

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

function ItemRow({ item }: { item: WatchlistItem }) {
  return (
    <div className={styles.row}>
      <Link className={styles.symbol} to={`/stocks/${encodeURIComponent(item.symbol)}`}>
        <span className={styles.symbolCode}>{item.symbol}</span>
        <span className={styles.symbolName}>{item.name}</span>
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
      <span className={styles.cellEvent}>{DASH}</span>
    </div>
  );
}

function ReadyCard({ watchlist }: { watchlist: Watchlist }) {
  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>관심종목</h2>
          <span className={styles.count}>{watchlist.items.length}개</span>
        </div>
        <span className={styles.legend}>
          업데이트 {formatUpdatedAt(watchlist.updated_at)}
        </span>
      </div>
      {watchlist.items.length === 0 ? (
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
          </div>
          {watchlist.items.map((item) => (
            <ItemRow key={`${item.exchange}:${item.symbol}`} item={item} />
          ))}
        </>
      )}
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

  if (state.status === "signed-out") {
    return (
      <StatusCard>
        <div className={styles.signInPrompt}>
          <span>로그인하면 내 관심종목과 메모를 볼 수 있습니다.</span>
          <button
            type="button"
            className={styles.signInButton}
            onClick={() => void auth.signInWithGoogle()}
          >
            로그인
          </button>
        </div>
      </StatusCard>
    );
  }
  if (state.status === "config-error") {
    return <StatusCard>Supabase 브라우저 설정이 필요합니다.</StatusCard>;
  }
  if (state.status === "loading") {
    return <StatusCard>불러오는 중…</StatusCard>;
  }
  if (state.status === "error") {
    return <StatusCard>관심종목을 불러오지 못했습니다. ({state.message})</StatusCard>;
  }
  return <ReadyCard watchlist={state.watchlist} />;
}
