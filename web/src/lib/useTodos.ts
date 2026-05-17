import { useCallback, useEffect, useState } from "react";
import { apiClient, type TodoCreate, type TodoDb, type TodoPatch } from "./api-client";
import { useAuth } from "./auth-state";

export type TodosState =
  | { status: "signed-out" }
  | { status: "loading" }
  | { status: "ready"; items: TodoDb[] }
  | { status: "error"; message: string };

export function useTodos() {
  const auth = useAuth();
  const [state, setState] = useState<TodosState>({ status: "loading" });

  const reload = useCallback(async () => {
    if (auth.status !== "signed-in") return;
    setState({ status: "loading" });
    try {
      const res = await apiClient.listTodos();
      setState({ status: "ready", items: res.items });
    } catch (err) {
      const message = err instanceof Error ? err.message : "할 일 로딩 실패";
      setState({ status: "error", message });
    }
  }, [auth.status]);

  useEffect(() => {
    if (auth.status === "signed-out" || auth.status === "config-error") {
      setState({ status: "signed-out" });
      return;
    }
    if (auth.status === "signed-in") {
      void reload();
    }
  }, [auth.status, reload]);

  async function create(body: TodoCreate) {
    if (auth.status !== "signed-in") return;
    const row = await apiClient.createTodo(body);
    setState((s) => (s.status === "ready" ? { status: "ready", items: [row, ...s.items] } : s));
    return row;
  }

  async function patch(id: string, body: TodoPatch) {
    if (auth.status !== "signed-in") return;
    const row = await apiClient.patchTodo(id, body);
    setState((s) => (s.status === "ready" ? { status: "ready", items: s.items.map((t) => t.id === id ? row : t) } : s));
    return row;
  }

  async function remove(id: string) {
    if (auth.status !== "signed-in") return;
    await apiClient.deleteTodo(id);
    setState((s) => (s.status === "ready" ? { status: "ready", items: s.items.filter((t) => t.id !== id) } : s));
  }

  return { state, reload, create, patch, remove };
}
