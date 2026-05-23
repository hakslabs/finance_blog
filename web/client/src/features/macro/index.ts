import { apiGet } from "@/lib/http";
import type { MacroIndicator } from "@/types";
import { useAsync } from "@/features/_shared/useAsync";
import { MACRO_INDICATORS } from "@/services/mockData";

export const macroService = {
  list: () => apiGet<{ items: MacroIndicator[] }>(`/macros`),
};

export function useMacroIndicators() {
  return useAsync(
    () =>
      macroService
        .list()
        .then((r) => (r.items.length ? r.items : MACRO_INDICATORS)),
    [],
    MACRO_INDICATORS,
  );
}
