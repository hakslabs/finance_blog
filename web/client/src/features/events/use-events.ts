import { useEffect, useState } from "react";
import { eventsService } from "./service";
import type { EconomicEvent } from "./types";

export function useEconomicEvents(params: {
  from?: string;
  to?: string;
  country?: string;
} = {}) {
  const [data, setData] = useState<EconomicEvent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const key = `${params.from ?? ""}|${params.to ?? ""}|${params.country ?? ""}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    eventsService
      .economic(params)
      .then((rows) => {
        if (!cancelled) {
          setData(rows);
          setError(null);
        }
      })
      .catch((e: Error) => !cancelled && setError(e))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { data, loading, error };
}
