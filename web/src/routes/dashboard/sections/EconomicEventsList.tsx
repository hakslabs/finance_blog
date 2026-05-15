import { Badge } from "../../../components/primitives/Badge";
import { Card } from "../../../components/primitives/Card";
import type { EconomicEvent, EventType } from "../../../fixtures/dashboard";
import styles from "./EconomicEventsList.module.css";

const TYPE_CLASS: Record<EventType, string> = {
  earnings: styles.typeEarnings,
  dividend: styles.typeDividend,
  macro: styles.typeMacro,
};

const TYPE_LABEL: Record<EventType, string> = {
  earnings: "실적",
  dividend: "배당",
  macro: "매크로",
};

const IMPORTANCE_LEVELS = [1, 2, 3] as const;

export function EconomicEventsList({
  events,
  starredEventIds,
  onOpenEvent,
  onToggleReminder,
}: {
  events: EconomicEvent[];
  starredEventIds?: Set<string>;
  onOpenEvent?: (event: EconomicEvent) => void;
  onToggleReminder?: (event: EconomicEvent) => void;
}) {
  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <h2 className={styles.title}>내 캘린더</h2>
          <span className={styles.subtitle}>
            시장 이벤트 + 내 종목 실적 · 배당
          </span>
        </div>
        <Badge tone="neutral">2주</Badge>
      </div>
      {events.map((e) => (
        <div
          key={e.id}
          className={styles.row}
        >
          <button
            type="button"
            className={starredEventIds?.has(e.id) ? styles.starActive : styles.star}
            aria-label={`${e.event} 관심 일정 ${starredEventIds?.has(e.id) ? "해제" : "등록"}`}
            aria-pressed={starredEventIds?.has(e.id) ?? false}
            onClick={() => onToggleReminder?.(e)}
          >
            ★
          </button>
          <div className={styles.dateBox}>
            <span className={styles.dayName}>{e.dayOfWeek}</span>
            <span className={styles.dayNum}>{e.dateLabel.split("/")[1]}</span>
          </div>
          <div className={styles.divider} />
          <button
            type="button"
            className={styles.bodyButton}
            onClick={() => onOpenEvent?.(e)}
          >
            <div className={styles.name}>{e.event}</div>
            <div className={styles.tags}>
              <span className={TYPE_CLASS[e.type]}>{TYPE_LABEL[e.type]}</span>
              <div className={styles.importance}>
                {IMPORTANCE_LEVELS.map((k) => (
                  <div
                    key={k}
                    className={k <= e.importance ? styles.barActive : styles.bar}
                  />
                ))}
              </div>
              {e.heldWeight && (
                <span className={styles.holdInfo}>
                  · 보유{" "}
                  <b className={styles.holdInfoStrong}>{e.heldWeight}</b>
                </span>
              )}
              {e.memoCount > 0 && (
                <span className={styles.memoLink}>· 메모 {e.memoCount}</span>
              )}
              {e.checklistProgress && (
                <span className={styles.checklist}>
                  · 체크리스트 {e.checklistProgress}
                </span>
              )}
            </div>
          </button>
        </div>
      ))}
    </Card>
  );
}
