import { apiGet } from "@/lib/http";
import type { MacroIndicatorsResponse } from "./types";

export const macrosService = {
  indicators: () =>
    apiGet<MacroIndicatorsResponse>("/macros/indicators").then(
      (r) => r.indicators,
    ),
};
