// Pure indicator computations for ChartSection subcharts. No deps.

export function rsi14(closes: number[]): (number | null)[] {
  const period = 14;
  const out: (number | null)[] = new Array(closes.length).fill(null);
  if (closes.length < period + 1) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d;
    else loss += -d;
  }
  let avgG = gain / period;
  let avgL = loss / period;
  out[period] = 100 - 100 / (1 + (avgL === 0 ? Infinity : avgG / avgL));
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    const g = d >= 0 ? d : 0;
    const l = d < 0 ? -d : 0;
    avgG = (avgG * (period - 1) + g) / period;
    avgL = (avgL * (period - 1) + l) / period;
    out[i] = 100 - 100 / (1 + (avgL === 0 ? Infinity : avgG / avgL));
  }
  return out;
}

function ema(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period) return out;
  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  out[period - 1] = sum / period;
  for (let i = period; i < values.length; i++) {
    out[i] = values[i] * k + (out[i - 1] as number) * (1 - k);
  }
  return out;
}

export type MACDPoint = { macd: number | null; signal: number | null; hist: number | null };

export function macd(closes: number[], fast = 12, slow = 26, signalP = 9): MACDPoint[] {
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);
  const macdLine: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (emaFast[i] != null && emaSlow[i] != null) {
      macdLine.push((emaFast[i] as number) - (emaSlow[i] as number));
      indices.push(i);
    }
  }
  const sigPartial = ema(macdLine, signalP);
  const out: MACDPoint[] = closes.map(() => ({ macd: null, signal: null, hist: null }));
  for (let j = 0; j < macdLine.length; j++) {
    const i = indices[j];
    const m = macdLine[j];
    const s = sigPartial[j];
    out[i] = { macd: m, signal: s, hist: s != null ? m - (s as number) : null };
  }
  return out;
}
