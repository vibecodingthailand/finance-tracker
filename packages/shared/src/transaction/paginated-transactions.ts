import type { TransactionResponse } from "./transaction-response";

export interface PaginatedTransactions {
  data: TransactionResponse[];
  total: number;
  page: number;
  limit: number;
}
