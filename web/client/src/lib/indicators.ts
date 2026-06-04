/**
 * Pure technical-indicator + risk math computed client-side from real OHLCV
 * bars. No mock data — every value here is derived from the DB/API bars that
 * the page already fetched. Callers must handle the `null` returns that occur
 * when there aren't enough bars to compute a given window (the Terminal page
 * surfaces those as "데이터 없음" instead of inventing numbers).
 */

export interface Bar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** Simple moving average of the last `period` closes. */
export function sma(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const slice = closes.slice(closes.length - period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

/** Exponential moving average (last value of the EMA series). */
export function ema(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const k = 2 / (period + 1);
  // Seed with the SMA of the first `period` values, then walk forward.
  let prev = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < closes.length; i++) {
    prev = closes[i] * k + prev * (1 - k);
  }
  return prev;
}

/** Full EMA series (same length as input, leading values are null). */
function emaSeries(closes: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(closes.length).fill(null);
  if (closes.length < period) return out;
  const k = 2 / (period + 1);
  let prev = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = prev;
  for (let i = period; i < closes.length; i++) {
    prev = closes[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

/** Wilder's RSI over `period` (default 14). */
export function rsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const up = diff > 0 ? diff : 0;
    const down = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + up) / period;
    avgLoss = (avgLoss * (period - 1) + down) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/** MACD (12,26) line + signal (9) — last values. */
export function macd(
  closes: number[],
): { macd: number; signal: number; hist: number } | null {
  if (closes.length < 26 + 9) return null;
  const fast = emaSeries(closes, 12);
  const slow = emaSeries(closes, 26);
  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    const f = fast[i];
    const s = slow[i];
    if (f == null || s == null) continue;
    macdLine.push(f - s);
  }
  const signal = ema(macdLine, 9);
  if (signal == null) return null;
  const last = macdLine[macdLine.length - 1];
  return { macd: last, signal, hist: last - signal };
}

/** Daily simple returns from a close series. */
export function dailyReturns(closes: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] === 0) continue;
    out.push(closes[i] / closes[i - 1] - 1);
  }
  return out;
}

/** Annualized volatility (stdev of daily returns × √252), as a fraction. */
export function annualizedVol(closes: number[]): number | null {
  const r = dailyReturns(closes);
  if (r.length < 20) return null;
  const mean = r.reduce((a, b) => a + b, 0) / r.length;
  const variance = r.reduce((a, b) => a + (b - mean) ** 2, 0) / (r.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252);
}

/** Max drawdown over the window, as a negative fraction (e.g. -0.32). */
export function maxDrawdown(closes: number[]): number | null {
  if (closes.length < 2) return null;
  let peak = closes[0];
  let maxDd = 0;
  for (const c of closes) {
    if (c > peak) peak = c;
    const dd = c / peak - 1;
    if (dd < maxDd) maxDd = dd;
  }
  return maxDd;
}

/** Historical 1-day VaR at the given confidence (e.g. 0.95) as a fraction. */
export function historicalVar(
  closes: number[],
  confidence = 0.95,
): number | null {
  const r = dailyReturns(closes);
  if (r.length < 20) return null;
  const sorted = [...r].sort((a, b) => a - b);
  const idx = Math.floor((1 - confidence) * sorted.length);
  return sorted[Math.min(idx, sorted.length - 1)];
}

/** Pearson correlation of two equal-length return series. */
export function correlation(a: number[], b: number[]): number | null {
  const n = Math.min(a.length, b.length);
  if (n < 5) return null;
  const xa = a.slice(a.length - n);
  const xb = b.slice(b.length - n);
  const ma = xa.reduce((s, v) => s + v, 0) / n;
  const mb = xb.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const va = xa[i] - ma;
    const vb = xb[i] - mb;
    num += va * vb;
    da += va * va;
    db += vb * vb;
  }
  if (da === 0 || db === 0) return null;
  return num / Math.sqrt(da * db);
}
