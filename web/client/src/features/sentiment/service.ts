import { apiGet } from "@/lib/http";
import type { FearGreedResponse } from "./types";

export const sentimentService = {
  fearGreed: () =>
    apiGet<FearGreedResponse>("/sentiment/fear-greed").then((r) => r.items),
};
