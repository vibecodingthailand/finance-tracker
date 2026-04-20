import type {
  CategoryResponse,
  PaginatedTransactions,
  SummaryResponse,
  TransactionResponse,
  TransactionType,
} from "@finance-tracker/shared";
import { apiRequest } from "./api";

export interface SummaryParams {
  month: number;
  year: number;
}

export interface ListParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  type?: TransactionType;
}

export interface CreateTransactionInput {
  amount: number;
  type: TransactionType;
  description?: string;
  categoryId: string;
}

export interface UpdateTransactionInput {
  amount?: number;
  type?: TransactionType;
  description?: string;
  categoryId?: string;
}

export function fetchSummary(params: SummaryParams): Promise<SummaryResponse> {
  return apiRequest<SummaryResponse>("/transactions/summary", {
    query: { month: params.month, year: params.year },
  });
}

export function fetchTransactions(
  params: ListParams = {},
): Promise<PaginatedTransactions> {
  return apiRequest<PaginatedTransactions>("/transactions", {
    query: {
      page: params.page,
      limit: params.limit,
      startDate: params.startDate,
      endDate: params.endDate,
      categoryId: params.categoryId,
      type: params.type,
    },
  });
}

export function fetchCategories(): Promise<CategoryResponse[]> {
  return apiRequest<CategoryResponse[]>("/categories");
}

export function createTransaction(
  input: CreateTransactionInput,
): Promise<TransactionResponse> {
  return apiRequest<TransactionResponse>("/transactions", {
    method: "POST",
    body: input,
  });
}

export function updateTransaction(
  id: string,
  input: UpdateTransactionInput,
): Promise<TransactionResponse> {
  return apiRequest<TransactionResponse>(`/transactions/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export function deleteTransaction(id: string): Promise<void> {
  return apiRequest<void>(`/transactions/${id}`, {
    method: "DELETE",
  });
}
