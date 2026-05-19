/**
 * Residual mock universe used only by MyPage's stock-search autocomplete
 * (WatchlistTab + AddTradeModal). Every other surface is wired to real
 * /api/v1/* endpoints via features/*.
 *
 * When MyPage moves to a backend-backed stock search (e.g. /v1/search?q=)
 * this file goes away.
 */

import type { Stock } from "@/types";

export const US_STOCKS: Stock[] = [
  { ticker: "AAPL", name: "Apple Inc.", price: 189.84, changePct: 1.24, change: 2.32, volume: 54820000, marketCap: "$2.94T", sector: "Technology", exchange: "NASDAQ", country: "US", pe: 28.4, pbr: 46.2, roe: 147.6, dividendYield: 0.54 },
  { ticker: "NVDA", name: "NVIDIA Corp.", price: 924.79, changePct: 3.42, change: 30.58, volume: 42180000, marketCap: "$2.28T", sector: "Semiconductors", exchange: "NASDAQ", country: "US", pe: 65.2, pbr: 38.4, roe: 91.2, dividendYield: 0.03 },
  { ticker: "MSFT", name: "Microsoft Corp.", price: 420.21, changePct: 0.88, change: 3.67, volume: 22340000, marketCap: "$3.12T", sector: "Technology", exchange: "NASDAQ", country: "US", pe: 36.8, pbr: 12.4, roe: 38.5, dividendYield: 0.72 },
  { ticker: "GOOGL", name: "Alphabet Inc.", price: 175.42, changePct: 1.12, change: 1.94, volume: 18920000, marketCap: "$2.18T", sector: "Communication", exchange: "NASDAQ", country: "US", pe: 24.2, pbr: 6.8, roe: 28.4, dividendYield: 0.0 },
  { ticker: "META", name: "Meta Platforms", price: 512.38, changePct: 2.14, change: 10.74, volume: 16480000, marketCap: "$1.31T", sector: "Communication", exchange: "NASDAQ", country: "US", pe: 26.4, pbr: 7.2, roe: 34.8, dividendYield: 0.4 },
  { ticker: "AMZN", name: "Amazon.com Inc.", price: 192.46, changePct: 0.64, change: 1.22, volume: 28740000, marketCap: "$2.02T", sector: "Consumer Disc.", exchange: "NASDAQ", country: "US", pe: 42.8, pbr: 8.4, roe: 22.4, dividendYield: 0.0 },
  { ticker: "TSLA", name: "Tesla Inc.", price: 177.82, changePct: -1.84, change: -3.34, volume: 82640000, marketCap: "$567B", sector: "Automotive", exchange: "NASDAQ", country: "US", pe: 48.2, pbr: 9.8, roe: 18.2, dividendYield: 0.0 },
  { ticker: "TSM", name: "TSMC", price: 168.24, changePct: 2.84, change: 4.64, volume: 12480000, marketCap: "$873B", sector: "Semiconductors", exchange: "NYSE", country: "US", pe: 22.4, pbr: 5.8, roe: 28.4, dividendYield: 1.42 },
  { ticker: "AMD", name: "Advanced Micro Devices", price: 162.48, changePct: 4.12, change: 6.42, volume: 38420000, marketCap: "$263B", sector: "Semiconductors", exchange: "NASDAQ", country: "US", pe: 84.2, pbr: 3.8, roe: 4.8, dividendYield: 0.0 },
  { ticker: "AVGO", name: "Broadcom Inc.", price: 1482.4, changePct: 1.84, change: 26.82, volume: 4820000, marketCap: "$693B", sector: "Semiconductors", exchange: "NASDAQ", country: "US", pe: 32.4, pbr: 12.8, roe: 42.8, dividendYield: 1.28 },
];

export const KR_STOCKS: Stock[] = [
  { ticker: "005930", name: "삼성전자", price: 76400, changePct: 0.51, change: 390, volume: 18420000, marketCap: "456조", sector: "반도체", exchange: "KOSPI", country: "KR", pe: 14.2, pbr: 1.4, roe: 10.2, dividendYield: 2.84 },
  { ticker: "000660", name: "SK하이닉스", price: 198500, changePct: -1.24, change: -2500, volume: 4820000, marketCap: "144조", sector: "반도체", exchange: "KOSPI", country: "KR", pe: 18.4, pbr: 2.8, roe: 16.4, dividendYield: 0.84 },
  { ticker: "035420", name: "NAVER", price: 214500, changePct: 0.94, change: 2000, volume: 1240000, marketCap: "35조", sector: "IT서비스", exchange: "KOSPI", country: "KR", pe: 28.4, pbr: 2.4, roe: 8.4, dividendYield: 0.42 },
  { ticker: "051910", name: "LG화학", price: 312000, changePct: -2.18, change: -6900, volume: 842000, marketCap: "22조", sector: "2차전지", exchange: "KOSPI", country: "KR", pe: 42.8, pbr: 1.8, roe: 4.2, dividendYield: 1.24 },
  { ticker: "373220", name: "LG에너지솔루션", price: 384000, changePct: -1.84, change: -7200, volume: 624000, marketCap: "90조", sector: "2차전지", exchange: "KOSPI", country: "KR", pe: 84.2, pbr: 4.8, roe: 5.8, dividendYield: 0.0 },
  { ticker: "207940", name: "삼성바이오로직스", price: 842000, changePct: 1.44, change: 12000, volume: 284000, marketCap: "60조", sector: "바이오", exchange: "KOSPI", country: "KR", pe: 68.4, pbr: 8.4, roe: 12.4, dividendYield: 0.0 },
  { ticker: "005380", name: "현대차", price: 248500, changePct: 0.81, change: 2000, volume: 1420000, marketCap: "53조", sector: "자동차", exchange: "KOSPI", country: "KR", pe: 6.8, pbr: 0.82, roe: 12.8, dividendYield: 3.84 },
  { ticker: "000270", name: "기아", price: 98400, changePct: 1.24, change: 1200, volume: 2840000, marketCap: "40조", sector: "자동차", exchange: "KOSPI", country: "KR", pe: 5.4, pbr: 0.94, roe: 18.4, dividendYield: 4.82 },
];
