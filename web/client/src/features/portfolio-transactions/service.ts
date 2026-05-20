import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/http";

export type TxType = "buy" | "sell" | "dividend" | "deposit";

export interface Transaction {
  id: string;
  portfolio_id: string;
  instrument_id: string | null;
  symbol: string | null;
  name: string | null;
  exchange: string | null;
  type: TxType;
  quantity: number | null;
  price: number | null;
  amount: number;
  currency: string;
  note: string | null;
  occurred_at: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface TransactionCreate {
  symbol?: string;
  instrument_id?: string;
  type: TxType;
  quantity?: number;
  price?: number;
  amount?: number;
  currency?: string;
  note?: string;
  occurred_at: string; // YYYY-MM-DD
}

export const portfolioTransactionsService = {
  list: () =>
    apiGet<{ items: Transaction[] }>("/portfolios/me/transactions").then((r) => r.items),
  create: (input: TransactionCreate) =>
    apiPost<Transaction>("/portfolios/me/transactions", input),
  patch: (id: string, patch: Partial<Pick<Transaction, "quantity" | "price" | "amount" | "note" | "occurred_at">>) =>
    apiPatch<Transaction>(`/portfolios/me/transactions/${encodeURIComponent(id)}`, patch),
  remove: (id: string) =>
    apiDelete<{ deleted: string }>(`/portfolios/me/transactions/${encodeURIComponent(id)}`),
};
