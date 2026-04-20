import { TransactionType } from "../category/transaction-type";

export interface TransactionCategorySummary {
  id: string;
  name: string;
  icon: string;
}

export interface TransactionResponse {
  id: string;
  amount: number;
  type: TransactionType;
  description: string | null;
  categoryId: string;
  category: TransactionCategorySummary;
  createdAt: string;
}
