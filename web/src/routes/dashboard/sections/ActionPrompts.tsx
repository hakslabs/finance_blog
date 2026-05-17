import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
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
  onToggleTodo,
  onAddTodo,
  onDeleteTodo,
  onOpenAll,
}: {
  todos: TodoItem[];
  onOpenTodo?: (todo: TodoItem) => void;
  onToggleTodo?: (todo: TodoItem) => void;
  onAddTodo?: (title: string) => void;
  onDeleteTodo?: (id: string) => void;
  onOpenAll?: () => void;
}) {
  const [draft, setDraft] = useState("");
  const handleAdd = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const t = draft.trim();
    if (!t || !onAddTodo) return;
    onAddTodo(t);
    setDraft("");
  };
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
          <div
            key={todo.id}
            className={todo.done ? styles.itemDone : styles.item}
          >
            <button
              type="button"
              className={todo.done ? styles.checkboxChecked : styles.checkbox}
              aria-label={`${todo.task} ${todo.done ? "미완료로 변경" : "완료로 변경"}`}
              aria-pressed={todo.done}
              onClick={() => onToggleTodo?.(todo)}
            />
            <button
              type="button"
              className={styles.todoBody}
              onClick={() => onOpenTodo?.(todo)}
            >
              <span
                className={todo.done ? styles.taskTextDone : styles.taskText}
              >
                {todo.task}
              </span>
              <span className={SOURCE_CLASS[todo.source]}>{todo.source}</span>
              <span className={styles.categoryTag}>{todo.category}</span>
              <span className={styles.metaText}>{todo.meta}</span>
            </button>
            {onDeleteTodo ? (
              <button
                type="button"
                className={styles.deleteBtn}
                aria-label={`${todo.task} 삭제`}
                onClick={() => onDeleteTodo(todo.id)}
              >
                <X size={12} aria-hidden="true" strokeWidth={2} />
              </button>
            ) : null}
          </div>
        ))}
      </div>
      {onAddTodo ? (
        <form className={styles.addRow} onSubmit={handleAdd}>
          <input
            type="text"
            className={styles.addInput}
            placeholder="새 할 일 (예: 삼성전자 실적 메모 정리)"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={200}
          />
          <button type="submit" className={styles.addBtn} disabled={!draft.trim()}>추가</button>
        </form>
      ) : null}
    </Card>
  );
}
