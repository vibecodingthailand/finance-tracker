import { TransactionType } from "../category/transaction-type";
import type { TransactionCategorySummary } from "../transaction/transaction-response";

export interface RecurringResponse {
  id: string;
  amount: number;
  type: TransactionType;
  description: string | null;
  categoryId: string;
  category: TransactionCategorySummary;
  dayOfMonth: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
