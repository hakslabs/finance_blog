import { useEffect, useState } from "react";
import { macrosService } from "./service";
import type { MacroIndicator } from "./types";

export function useMacroIndicators() {
  const [data, setData] = useState<MacroIndicator[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    macrosService
      .indicators()
      .then((r) => {
        if (!cancelled) {
          setData(r);
          setError(null);
        }
      })
      .catch((e: Error) => !cancelled && setError(e))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}
