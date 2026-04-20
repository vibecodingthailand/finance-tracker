import type { BudgetStatusResponse } from "@finance-tracker/shared";
import { apiRequest } from "./api";

export interface SaveBudgetInput {
  amount: number;
  categoryId: string;
  month: number;
  year: number;
}

export function fetchBudgetStatus(
  month: number,
  year: number,
): Promise<BudgetStatusResponse> {
  return apiRequest<BudgetStatusResponse>("/budgets/status", {
    query: { month, year },
  });
}

export function saveBudget(input: SaveBudgetInput): Promise<void> {
  return apiRequest<void>("/budgets", {
    method: "POST",
    body: input,
  });
}
