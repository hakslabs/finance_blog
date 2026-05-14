function buildSparkline(up: boolean, width: number, height: number): string {
  const pts: string[] = [];
  const steps = 6;
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * width;
    const base = up ? height * 0.8 : height * 0.2;
    const wave = up
      ? Math.sin(i * 0.8) * height * 0.25 - i * 0.05
      : Math.cos(i * 0.7) * height * 0.25 + i * 0.05;
    pts.push(`${x},${Math.max(1, Math.min(height - 1, base + wave))}`);
  }
  return `M${pts.join("L")}`;
}

export const SPARK_MACRO_UP = buildSparkline(true, 40, 14);
export const SPARK_MACRO_DOWN = buildSparkline(false, 40, 14);
export const SPARK_ROW_UP = buildSparkline(true, 28, 14);
export const SPARK_ROW_DOWN = buildSparkline(false, 28, 14);
