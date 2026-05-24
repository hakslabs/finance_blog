export type CompareSeriesRow = Record<string, number | string | null>;

export type RebasedCompareResult<T = CompareSeriesRow> = {
  rows: T[];
  returns: Record<string, number>;
  baselineDate: string | null;
};

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && ISO_DATE_RE.test(value);
}

export function compareLabelForDate(
  date: string,
  lookbackDays: number,
): string {
  if (lookbackDays >= 365) return `${date.slice(2, 4)}/${date.slice(5, 7)}`;
  return `${date.slice(5, 7)}/${date.slice(8, 10)}`;
}

function dateTime(date: string): number {
  return Date.parse(`${date}T00:00:00.000Z`);
}

export function filterRowsByLookback<T extends CompareSeriesRow>(
  rows: T[],
  lookbackDays: number,
): T[] {
  const validRows = rows.filter((row) => isIsoDate(row.date));
  if (validRows.length === 0) return [];

  const latestDate = String(validRows[validRows.length - 1].date);
  const latestTime = dateTime(latestDate);
  if (!Number.isFinite(latestTime)) return validRows;

  const cutoffTime = latestTime - Math.max(0, lookbackDays - 1) * 86_400_000;
  return validRows.filter((row) => {
    const time = dateTime(String(row.date));
    return Number.isFinite(time) && time >= cutoffTime;
  });
}

export function rebaseCompareRows<
  T extends CompareSeriesRow,
  U = CompareSeriesRow,
>(
  sourceRows: T[],
  symbols: readonly string[],
  lookbackDays: number,
  mapRow?: (row: CompareSeriesRow, context: { baselineDate: string }) => U,
): RebasedCompareResult<U> {
  if (symbols.length === 0) {
    return { rows: [], returns: {}, baselineDate: null };
  }

  const windowRows = filterRowsByLookback(sourceRows, lookbackDays);
  if (windowRows.length === 0) {
    return { rows: [], returns: {}, baselineDate: null };
  }

  const commonBaselineIndex = windowRows.findIndex((row) =>
    symbols.every((symbol) => typeof row[symbol] === "number"),
  );
  if (commonBaselineIndex < 0) {
    return { rows: [], returns: {}, baselineDate: null };
  }

  const alignedRows = windowRows.slice(commonBaselineIndex);
  const baselineRow = alignedRows[0] ?? {};
  const baselineDate = isIsoDate(baselineRow.date) ? baselineRow.date : null;
  if (!baselineDate) {
    return { rows: [], returns: {}, baselineDate: null };
  }

  const baselines = new Map(
    symbols.map((symbol) => [
      symbol,
      typeof baselineRow[symbol] === "number"
        ? (baselineRow[symbol] as number)
        : null,
    ]),
  );

  const rebaseValue = (value: unknown, baseline: number | null) => {
    if (typeof value !== "number" || baseline == null) return null;
    const denominator = 1 + baseline / 100;
    if (!Number.isFinite(denominator) || denominator === 0) return null;
    return ((1 + value / 100) / denominator - 1) * 100;
  };

  const rebasedRows = alignedRows.map((row) => {
    const next: CompareSeriesRow = { date: row.date };
    for (const symbol of symbols) {
      next[symbol] = rebaseValue(row[symbol], baselines.get(symbol) ?? null);
    }
    return next;
  });

  const returns: Record<string, number> = {};
  for (const symbol of symbols) {
    const last = [...rebasedRows]
      .reverse()
      .find((row) => typeof row[symbol] === "number");
    if (typeof last?.[symbol] === "number") returns[symbol] = last[symbol];
  }

  const rows = rebasedRows.map((row) =>
    mapRow ? mapRow(row, { baselineDate }) : (row as U),
  );

  return { rows, returns, baselineDate };
}
