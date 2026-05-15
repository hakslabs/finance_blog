import { Badge } from "../../../components/primitives/Badge";
import { Card } from "../../../components/primitives/Card";
import type { TodoItem, TodoSource } from "../../../fixtures/dashboard";
import styles from "./ActionPrompts.module.css";

const SOURCE_CLASS: Record<TodoSource, string> = {
  공통: styles.sourceCommon,
  알람: styles.sourceAlarm,
  Thesis: styles.sourceThesis,
};

export function ActionPrompts({
  todos,
  onOpenTodo,
  onOpenAll,
}: {
  todos: TodoItem[];
  onOpenTodo?: (todo: TodoItem) => void;
  onOpenAll?: () => void;
}) {
  const doneCount = todos.filter((t) => t.done).length;
  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h2 className={styles.title}>오늘 할 일</h2>
          <span className={styles.subtitle}>
            시장 이벤트 + 내 포지션 기반 추천
          </span>
        </div>
        <button type="button" className={styles.progress} onClick={onOpenAll}>
          <span className={styles.progressText}>
            완료 {doneCount} / {todos.length}
          </span>
          <Badge tone="accent">마이페이지 →</Badge>
        </button>
      </div>
      <div className={styles.grid}>
        {todos.map((todo) => (
          <button
            type="button"
            key={todo.id}
            className={todo.done ? styles.itemDone : styles.item}
            onClick={() => onOpenTodo?.(todo)}
          >
            <span
              className={todo.done ? styles.checkboxChecked : styles.checkbox}
            />
            <span
              className={todo.done ? styles.taskTextDone : styles.taskText}
            >
              {todo.task}
            </span>
            <span className={SOURCE_CLASS[todo.source]}>{todo.source}</span>
            <span className={styles.categoryTag}>{todo.category}</span>
            <span className={styles.metaText}>{todo.meta}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}
