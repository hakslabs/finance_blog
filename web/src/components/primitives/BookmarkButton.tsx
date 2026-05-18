import type { MouseEvent } from "react";
import { Star } from "lucide-react";
import { useSavedItems, type SavedItemKind } from "../../lib/saved-items";
import styles from "./BookmarkButton.module.css";

type BookmarkButtonProps = {
  kind: SavedItemKind;
  refId: string;
  /** Human label persisted alongside the saved-item (used by /mypage saved list). */
  title: string;
  /** Optional override for the saved-state aria-label suffix. */
  ariaLabel?: string;
};

export function BookmarkButton({ kind, refId, title, ariaLabel }: BookmarkButtonProps) {
  const { isSaved, toggle } = useSavedItems();
  const active = isSaved(kind, refId);
  const label = ariaLabel ?? `${title} 저장${active ? " 해제" : ""}`;
  return (
    <button
      type="button"
      className={active ? styles.active : styles.button}
      aria-label={label}
      aria-pressed={active}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        toggle({ kind, refId, title });
      }}
    >
      <Star size={14} aria-hidden="true" fill={active ? "currentColor" : "none"} />
    </button>
  );
}
