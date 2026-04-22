import type { MonthlyInsightData } from "@finance-tracker/shared";
import { apiRequest } from "./api";

export interface MonthlyInsightParams {
  month: number;
  year: number;
}

export function fetchMonthlyInsight(
  params: MonthlyInsightParams,
): Promise<MonthlyInsightData> {
  return apiRequest<MonthlyInsightData>("/insights", {
    query: { month: params.month, year: params.year },
  });
}
