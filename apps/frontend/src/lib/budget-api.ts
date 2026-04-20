import type { BudgetStatusResponse } from "@finance-tracker/shared";
import { apiRequest } from "./api";

export interface CreateBudgetInput {
  amount: number;
  categoryId: string;
  month: number;
  year: number;
}

export interface UpdateBudgetInput {
  amount: number;
}

export function fetchBudgetStatus(
  month: number,
  year: number,
): Promise<BudgetStatusResponse> {
  return apiRequest<BudgetStatusResponse>("/budgets/status", {
    query: { month, year },
  });
}

export function createBudget(input: CreateBudgetInput): Promise<void> {
  return apiRequest<void>("/budgets", {
    method: "POST",
    body: input,
  });
}

export function updateBudget(
  id: string,
  input: UpdateBudgetInput,
): Promise<void> {
  return apiRequest<void>(`/budgets/${id}`, {
    method: "PATCH",
    body: input,
  });
}
