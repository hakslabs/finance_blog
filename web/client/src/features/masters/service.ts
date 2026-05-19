import { apiGet } from "@/lib/http";
import type {
  MasterDetail,
  MasterHoldingsResponse,
  MasterSummary,
} from "./types";

export const mastersService = {
  list: () =>
    apiGet<{ masters: MasterSummary[] }>("/masters").then((r) => r.masters),
  detail: (slug: string) =>
    apiGet<{ master: MasterDetail }>(`/masters/${slug}`).then((r) => r.master),
  holdings: (slug: string, limit = 50) =>
    apiGet<MasterHoldingsResponse>(`/masters/${slug}/holdings?limit=${limit}`),
};
