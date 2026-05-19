import { apiGet } from "@/lib/http";
import type {
  ConsensusResponse,
  NextEarningResponse,
  ProfileResponse,
  StockHoldersResponse,
} from "./types";

export const stocksService = {
  profile: (symbol: string) =>
    apiGet<ProfileResponse>(`/stocks/${encodeURIComponent(symbol)}/profile`),
  consensus: (symbol: string) =>
    apiGet<ConsensusResponse>(
      `/stocks/${encodeURIComponent(symbol)}/consensus`,
    ),
  holders: (symbol: string) =>
    apiGet<StockHoldersResponse>(
      `/stocks/${encodeURIComponent(symbol)}/holders`,
    ),
  nextEarning: (symbol: string) =>
    apiGet<NextEarningResponse>(
      `/stocks/${encodeURIComponent(symbol)}/next-earning`,
    ),
};
