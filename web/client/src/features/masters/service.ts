import { apiGet } from "@/lib/http";
import type {
  MasterDetail,
  MasterHoldingsResponse,
  MasterQuartersResponse,
  MasterSummary,
} from "./types";

export const mastersService = {
  list: () =>
    apiGet<{ masters: MasterSummary[] }>("/masters").then((r) => r.masters),
  detail: (slug: string) =>
    apiGet<{ master: MasterDetail }>(`/masters/${slug}`).then((r) => r.master),
  holdings: (slug: string, limit = 50) =>
    apiGet<MasterHoldingsResponse>(`/masters/${slug}/holdings?limit=${limit}`),
  quarterChanges: (slug: string) =>
    apiGet<MasterQuartersResponse>(`/masters/${slug}/quarter-changes`),
};
