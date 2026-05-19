import { apiGet } from "@/lib/http";
import type {
  ConsensusResponse,
  FilingsResponse,
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
  filings: (symbol: string, limit = 10) =>
    apiGet<FilingsResponse>(
      `/stocks/${encodeURIComponent(symbol)}/filings?limit=${limit}`,
    ),
};
