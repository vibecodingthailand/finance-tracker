export interface CategoryBreakdown {
  name: string;
  icon: string;
  total: number;
  percentage: number;
}

export interface DailyTotal {
  date: string;
  income: number;
  expense: number;
}

export interface SummaryResponse {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  byCategoryExpense: CategoryBreakdown[];
  byCategoryIncome: CategoryBreakdown[];
  dailyTotals: DailyTotal[];
}
