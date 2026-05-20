/**
 * 일봉 배열에서 차트용 series(이평선·BB·MACD·RSI·Stoch) 계산.
 * 표준 공식을 사용하나, 초기 구간(미정의)은 같은 위치의 close 로 대체해 차트가 끊기지 않게 한다.
 */
import type { Bar } from "./service";

export interface ChartPoint {
  day: number; label: string;
  open: number; high: number; low: number; close: number; volume: number;
  ma5: number; ma20: number; ma60: number;
  bbUpper: number; bbMiddle: number; bbLower: number;
  macdLine: number; signalLine: number; histogram: number;
  rsi: number;
  stochK: number; stochD: number;
}

function sma(values: number[], period: number, i: number): number {
  if (i + 1 < period) return values[i];
  let sum = 0;
  for (let k = i - period + 1; k <= i; k++) sum += values[k];
  return sum / period;
}

function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out = new Array(values.length).fill(0);
  out[0] = values[0];
  for (let i = 1; i < values.length; i++) {
    out[i] = values[i] * k + out[i - 1] * (1 - k);
  }
  return out;
}

function rsi(closes: number[], period = 14): number[] {
  const out = new Array(closes.length).fill(50);
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    const g = d > 0 ? d : 0;
    const l = d < 0 ? -d : 0;
    if (i <= period) {
      avgGain += g; avgLoss += l;
      if (i === period) {
        avgGain /= period; avgLoss /= period;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        out[i] = 100 - 100 / (1 + rs);
      }
    } else {
      avgGain = (avgGain * (period - 1) + g) / period;
      avgLoss = (avgLoss * (period - 1) + l) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      out[i] = 100 - 100 / (1 + rs);
    }
  }
  return out;
}

function bbBand(closes: number[], i: number, period = 20, mult = 2): [number, number, number] {
  const mid = sma(closes, period, i);
  if (i + 1 < period) return [mid, mid, mid];
  let sumSq = 0;
  for (let k = i - period + 1; k <= i; k++) sumSq += (closes[k] - mid) ** 2;
  const std = Math.sqrt(sumSq / period);
  return [mid + mult * std, mid, mid - mult * std];
}

function stochastic(bars: Bar[], period = 14): { k: number[]; d: number[] } {
  const k: number[] = new Array(bars.length).fill(50);
  for (let i = 0; i < bars.length; i++) {
    const start = Math.max(0, i - period + 1);
    let hh = -Infinity, ll = Infinity;
    for (let j = start; j <= i; j++) {
      if (bars[j].h > hh) hh = bars[j].h;
      if (bars[j].l < ll) ll = bars[j].l;
    }
    k[i] = hh === ll ? 50 : ((bars[i].c - ll) / (hh - ll)) * 100;
  }
  const d: number[] = new Array(bars.length).fill(50);
  for (let i = 0; i < bars.length; i++) {
    const s = Math.max(0, i - 2);
    let sum = 0; let n = 0;
    for (let j = s; j <= i; j++) { sum += k[j]; n++; }
    d[i] = sum / n;
  }
  return { k, d };
}

export function barsToChartData(bars: Bar[]): ChartPoint[] {
  if (bars.length === 0) return [];
  const closes = bars.map(b => b.c);
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine = closes.map((_, i) => ema12[i] - ema26[i]);
  const signalLine = ema(macdLine, 9);
  const rsiArr = rsi(closes, 14);
  const stoch = stochastic(bars, 14);

  return bars.map((b, i) => {
    const [bbU, bbM, bbL] = bbBand(closes, i);
    const md = macdLine[i];
    const sg = signalLine[i];
    const date = b.t;
    const label = date.slice(5);  // MM-DD
    return {
      day: i + 1, label,
      open: b.o, high: b.h, low: b.l, close: b.c, volume: b.v ?? 0,
      ma5: sma(closes, 5, i),
      ma20: sma(closes, 20, i),
      ma60: sma(closes, 60, i),
      bbUpper: bbU, bbMiddle: bbM, bbLower: bbL,
      macdLine: md, signalLine: sg, histogram: md - sg,
      rsi: rsiArr[i],
      stochK: stoch.k[i], stochD: stoch.d[i],
    };
  });
}
