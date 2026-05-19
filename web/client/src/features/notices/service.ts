import { apiGet } from "@/lib/http";
import type { NoticesResponse } from "./types";

export const noticesService = {
  list: () => apiGet<NoticesResponse>("/notices").then((r) => r.items),
};
