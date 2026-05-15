import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { useAuth } from "./auth-state";

export type SavedItemKind = "report" | "stock" | "master" | "news";

export type SavedItem = {
  id: string;
  kind: SavedItemKind;
  refId: string;
  title: string;
  folder: string | null;
  savedAt: string;
  note?: string;
};

export type SavedItemInput = Omit<SavedItem, "id" | "savedAt" | "folder"> & {
  folder?: string | null;
};

type SavedItemsContextValue = {
  items: SavedItem[];
  isSaved: (kind: SavedItemKind, refId: string) => boolean;
  toggle: (item: SavedItemInput) => void;
  setFolder: (id: string, folder: string | null) => void;
  setNote: (id: string, note: string) => void;
  remove: (id: string) => void;
  folders: () => string[];
};

const SavedItemsContext = createContext<SavedItemsContextValue | null>(null);

function storageKey(userId: string | null): string | null {
  if (!userId) return null;
  return `finance-lab:saved:${userId}`;
}

function readInitial(userId: string | null): SavedItem[] {
  const key = storageKey(userId);
  if (!key || typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SavedItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry) =>
        entry &&
        typeof entry.id === "string" &&
        typeof entry.refId === "string" &&
        typeof entry.kind === "string" &&
        typeof entry.title === "string",
    );
  } catch {
    return [];
  }
}

function makeId(kind: SavedItemKind, refId: string): string {
  return `${kind}:${refId}`;
}

export function SavedItemsProvider({ children }: PropsWithChildren) {
  const auth = useAuth();
  const userId = auth.status === "signed-in" ? auth.user.id : null;
  const [items, setItems] = useState<SavedItem[]>(() => readInitial(userId));
  const [trackedUserId, setTrackedUserId] = useState<string | null>(userId);
  if (trackedUserId !== userId) {
    setTrackedUserId(userId);
    setItems(readInitial(userId));
  }

  useEffect(() => {
    const key = storageKey(userId);
    if (!key || typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(items));
  }, [items, userId]);

  const isSaved = useCallback(
    (kind: SavedItemKind, refId: string) =>
      items.some((entry) => entry.kind === kind && entry.refId === refId),
    [items],
  );

  const toggle = useCallback((input: SavedItemInput) => {
    const id = makeId(input.kind, input.refId);
    setItems((current) => {
      const exists = current.some((entry) => entry.id === id);
      if (exists) {
        return current.filter((entry) => entry.id !== id);
      }
      const next: SavedItem = {
        id,
        kind: input.kind,
        refId: input.refId,
        title: input.title,
        folder: input.folder ?? null,
        savedAt: new Date().toISOString(),
        note: input.note,
      };
      return [next, ...current];
    });
  }, []);

  const setFolder = useCallback((id: string, folder: string | null) => {
    setItems((current) =>
      current.map((entry) =>
        entry.id === id
          ? { ...entry, folder: folder && folder.trim() ? folder.trim() : null }
          : entry,
      ),
    );
  }, []);

  const setNote = useCallback((id: string, note: string) => {
    setItems((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, note } : entry)),
    );
  }, []);

  const remove = useCallback((id: string) => {
    setItems((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const folders = useCallback(() => {
    const set = new Set<string>();
    for (const entry of items) {
      if (entry.folder) set.add(entry.folder);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ko"));
  }, [items]);

  const value = useMemo<SavedItemsContextValue>(
    () => ({ items, isSaved, toggle, setFolder, setNote, remove, folders }),
    [items, isSaved, toggle, setFolder, setNote, remove, folders],
  );

  return (
    <SavedItemsContext.Provider value={value}>{children}</SavedItemsContext.Provider>
  );
}

export function useSavedItems(): SavedItemsContextValue {
  const value = useContext(SavedItemsContext);
  if (!value) {
    throw new Error("useSavedItems must be used inside SavedItemsProvider.");
  }
  return value;
}
