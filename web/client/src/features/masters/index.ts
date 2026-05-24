import { apiGet } from "@/lib/http";
import type { Master, MasterHolding } from "@/types";
import { useAsync } from "@/features/_shared/useAsync";
import { MASTERS } from "@/services/mockData";

type BackendMasterSummary = {
  id: string;
  slug: string;
  name: string;
  firm?: string | null;
  country_code?: string | null;
  style?: string | null;
  aum?: number | null;
  aum_currency?: string | null;
  photo_url?: string | null;
};

type BackendMaster = BackendMasterSummary & {
  description?: string | null;
  homepage_url?: string | null;
  filer_cik?: string | null;
  birth_year?: number | null;
  principles?: { ordinal: number; title: string; body?: string | null }[];
  books?: {
    id: string;
    ordinal: number;
    title: string;
    url?: string | null;
    year?: number | null;
  }[];
  strategies?: { ordinal: number; title: string; body?: string | null }[];
};

type BackendHolding = {
  symbol?: string | null;
  name?: string | null;
  shares: number;
  market_value?: number | null;
  weight_pct?: number | null;
};

type BackendHoldingsResponse = {
  period_end?: string | null;
  filed_at?: string | null;
  holdings: BackendHolding[];
};

type BackendQuarterRow = {
  symbol?: string | null;
  latest_weight?: number | null;
  prev_weight?: number | null;
  change_kind: "up" | "down" | "flat" | "new" | "exit";
};

const MASTER_ALIASES: Record<string, string> = {
  "warren-buffett": "buffett",
  charlie_munger: "munger",
  bill_ackman: "ackman",
};

function canonicalSlug(id: string): string {
  return MASTER_ALIASES[id] ?? id;
}

function formatAum(value?: number | null, currency = "USD"): string {
  if (value == null || !Number.isFinite(value)) return "";
  const prefix = currency === "USD" ? "$" : "";
  if (value >= 1_000_000_000_000)
    return `${prefix}${(value / 1_000_000_000_000).toFixed(1)}조`;
  if (value >= 1_000_000_000)
    return `${prefix}${(value / 1_000_000_000).toFixed(0)}B`;
  if (value >= 1_000_000) return `${prefix}${(value / 1_000_000).toFixed(0)}M`;
  return `${prefix}${value.toLocaleString()}`;
}

function formatMarketValue(value?: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
  return `$${value.toLocaleString()}`;
}

function formatShares(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toLocaleString();
}

function fixtureFor(
  summary: Pick<BackendMasterSummary, "slug" | "name">,
): Master | undefined {
  return MASTERS.find(
    (m) =>
      m.id === summary.slug ||
      canonicalSlug(m.id) === summary.slug ||
      m.name === summary.name,
  );
}

function changeKindToHoldingChange(
  kind?: BackendQuarterRow["change_kind"],
): MasterHolding["change"] {
  if (kind === "new") return "new";
  if (kind === "up") return "increased";
  if (kind === "down") return "decreased";
  if (kind === "exit") return "sold";
  return "unchanged";
}

function mapHolding(
  h: BackendHolding,
  changeBySymbol: Map<string, BackendQuarterRow>,
): MasterHolding | null {
  const ticker = h.symbol;
  if (!ticker) return null;
  const change = changeBySymbol.get(ticker);
  const latest = change?.latest_weight;
  const prev = change?.prev_weight;
  const changePct =
    latest != null && prev != null && Number.isFinite(latest - prev)
      ? Number((latest - prev).toFixed(2))
      : undefined;
  return {
    ticker,
    name: h.name ?? ticker,
    weight: Number((h.weight_pct ?? 0).toFixed(2)),
    shares: formatShares(h.shares),
    value: formatMarketValue(h.market_value),
    change: changeKindToHoldingChange(change?.change_kind),
    changePct,
  };
}

function mapMaster(
  summary: BackendMasterSummary,
  topHoldings?: MasterHolding[],
): Master {
  const fixture = fixtureFor(summary);
  const styleParts = (summary.style ?? "")
    .split(/[·,]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    ...(fixture ?? MASTERS[0]),
    id: summary.slug,
    name: summary.name,
    fund: summary.firm ?? fixture?.fund ?? "",
    firm: summary.firm ?? fixture?.firm,
    aum:
      formatAum(summary.aum, summary.aum_currency ?? "USD") ||
      fixture?.aum ||
      "",
    strategy: styleParts[0] ?? fixture?.strategy ?? "",
    style: styleParts.length ? styleParts : fixture?.style,
    nationality: summary.country_code === "US" ? "미국" : fixture?.nationality,
    topHoldings: topHoldings ?? fixture?.topHoldings ?? [],
  };
}

function mapMasterDetail(
  master: BackendMaster,
  holdingsResponse: BackendHoldingsResponse,
  quarterRows: BackendQuarterRow[],
): Master {
  const holdings = holdingsResponse.holdings;
  const changeBySymbol = new Map(
    quarterRows
      .filter((row) => row.symbol)
      .map((row) => [row.symbol as string, row]),
  );
  const topHoldings = holdings
    .map((holding) => mapHolding(holding, changeBySymbol))
    .filter((holding): holding is MasterHolding => holding != null);
  const mapped = mapMaster(master, topHoldings);
  return {
    ...mapped,
    bio: master.description ?? mapped.bio,
    story: master.description ?? mapped.story,
    birthYear: master.birth_year ?? mapped.birthYear,
    philosophy:
      master.principles?.map((p) => p.body || p.title).filter(Boolean) ??
      mapped.philosophy,
    strategyDetail:
      master.strategies?.map((s) => `${s.title}: ${s.body ?? ""}`).join("\n") ??
      mapped.strategyDetail,
    holdings: topHoldings.length,
    holdingsPeriodEnd: holdingsResponse.period_end ?? mapped.holdingsPeriodEnd,
    holdingsFiledAt: holdingsResponse.filed_at ?? mapped.holdingsFiledAt,
    lastFiling:
      (holdingsResponse.filed_at ?? holdingsResponse.period_end)?.slice(
        0,
        10,
      ) ?? mapped.lastFiling,
  };
}

export const mastersService = {
  list: () =>
    apiGet<{ masters: BackendMasterSummary[] }>(`/masters`).then((r) => ({
      items: r.masters.map((master) => mapMaster(master)),
    })),
  get: async (id: string): Promise<Master> => {
    const slug = canonicalSlug(id);
    const [detail, holdings, quarters] = await Promise.all([
      apiGet<{ master: BackendMaster }>(`/masters/${encodeURIComponent(slug)}`),
      apiGet<BackendHoldingsResponse>(
        `/masters/${encodeURIComponent(slug)}/holdings?limit=50`,
      ).catch(() => ({ holdings: [] })),
      apiGet<{ rows: BackendQuarterRow[] }>(
        `/masters/${encodeURIComponent(slug)}/quarter-changes`,
      ).catch(() => ({ rows: [] })),
    ]);
    return mapMasterDetail(detail.master, holdings, quarters.rows);
  },
};

export function useMasters() {
  return useAsync(
    () => mastersService.list().then((r) => r.items),
    [],
    MASTERS,
  );
}

export function useMaster(id: string | undefined) {
  const fallback = id ? (MASTERS.find((m) => m.id === id) ?? null) : null;
  return useAsync(
    () => (id ? mastersService.get(id) : Promise.reject(new Error("no id"))),
    [id],
    fallback,
  );
}
