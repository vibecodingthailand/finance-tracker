import type {
  CategoryResponse,
  PaginatedTransactions,
  SummaryResponse,
} from "@finance-tracker/shared";
import { apiRequest } from "./api";

export interface SummaryParams {
  month: number;
  year: number;
}

export interface ListParams {
  page?: number;
  limit?: number;
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
    query: { page: params.page, limit: params.limit },
  });
}

export function fetchCategories(): Promise<CategoryResponse[]> {
  return apiRequest<CategoryResponse[]>("/categories");
}
