type ChartPlaceholderProps = {
  label: string;
  height?: number;
};

export function ChartPlaceholder({
  label,
  height = 240,
}: ChartPlaceholderProps) {
  return (
    <div className="chart-placeholder" style={{ minHeight: height }}>
      <span>{label}</span>
    </div>
  );
}
