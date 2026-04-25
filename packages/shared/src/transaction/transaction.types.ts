import { TransactionType } from '../common/transaction-type.enum';

export interface TransactionResponse {
  id: string;
  amount: number;
  type: TransactionType;
  description: string | null;
  categoryId: string;
  userId: string;
  createdAt: Date;
}

export interface PaginatedTransactionResponse {
  data: TransactionResponse[];
  total: number;
  page: number;
  limit: number;
}

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
