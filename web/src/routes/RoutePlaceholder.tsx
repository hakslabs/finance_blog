type RoutePlaceholderProps = {
  title: string;
  eyebrow: string;
  description: string;
};

export function RoutePlaceholder({
  title,
  eyebrow,
  description,
}: RoutePlaceholderProps) {
  return (
    <main className="route-shell">
      <p className="route-eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{description}</p>
    </main>
  );
}
