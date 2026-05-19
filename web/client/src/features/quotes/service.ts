import { apiGet } from "@/lib/http";
import type { Quote, QuoteRange } from "./types";

export const quotesService = {
  get: (symbol: string, range: QuoteRange = "6mo") =>
    apiGet<Quote>(
      `/quotes/${encodeURIComponent(symbol)}?range=${range}`,
    ),
};
