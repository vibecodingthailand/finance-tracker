import { TransactionType } from "../category/transaction-type";

export interface CategoryInsightBreakdown {
  categoryId: string;
  name: string;
  icon: string;
  total: number;
  count: number;
  percentage: number;
}

export interface CategoryAnomaly {
  categoryId: string;
  name: string;
  icon: string;
  type: TransactionType;
  previousTotal: number;
  currentTotal: number;
  changePercentage: number;
}

export interface MonthlyInsightData {
  month: number;
  year: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  savingsRate: number;
  byCategoryIncome: CategoryInsightBreakdown[];
  byCategoryExpense: CategoryInsightBreakdown[];
  anomalies: CategoryAnomaly[];
  summary: string;
}
