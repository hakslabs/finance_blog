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

export function EconomicEventsList({ events }: { events: EconomicEvent[] }) {
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
        <div key={e.id} className={styles.row}>
          <div className={styles.dateBox}>
            <span className={styles.dayName}>{e.dayOfWeek}</span>
            <span className={styles.dayNum}>{e.dateLabel.split("/")[1]}</span>
          </div>
          <div className={styles.divider} />
          <div className={styles.body}>
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
          </div>
        </div>
      ))}
    </Card>
  );
}
