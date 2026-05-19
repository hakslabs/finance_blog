import { apiGet } from "@/lib/http";
import type { BreadthResponse } from "./types";

export const marketService = {
  breadth: (market: "US" | "KR" = "US") =>
    apiGet<BreadthResponse>(`/market/breadth?market=${market}`),
};
