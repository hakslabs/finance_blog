import styles from "./Tabs.module.css";

export type TabItem<TId extends string = string> = {
  id: TId;
  label: string;
};

type TabsProps<TId extends string> = {
  items: readonly TId[] | readonly TabItem<TId>[];
  active: TId;
  onChange: (next: TId) => void;
  ariaLabel: string;
  variant?: "underline" | "pill";
};

function normalize<TId extends string>(items: readonly TId[] | readonly TabItem<TId>[]): TabItem<TId>[] {
  return items.map((item) => (typeof item === "string" ? { id: item, label: item } : item));
}

export function Tabs<TId extends string>({
  items,
  active,
  onChange,
  ariaLabel,
  variant = "underline",
}: TabsProps<TId>) {
  const normalized = normalize(items);
  const isPill = variant === "pill";
  const barClass = isPill ? styles.pillBar : styles.underlineBar;
  const inactiveClass = isPill ? styles.pillTab : styles.underlineTab;
  const activeClass = isPill ? styles.pillTabActive : styles.underlineTabActive;
  return (
    <nav className={barClass} aria-label={ariaLabel}>
      {normalized.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            className={isActive ? activeClass : inactiveClass}
            aria-current={isActive ? "page" : undefined}
            aria-pressed={isPill ? isActive : undefined}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
