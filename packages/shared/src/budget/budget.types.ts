export interface BudgetResponse {
  id: string;
  amount: number;
  categoryId: string;
  userId: string;
  month: number;
  year: number;
  createdAt: Date;
}

export interface BudgetStatusItem {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  budgetAmount: number;
  spentAmount: number;
  percentage: number;
  isOverBudget: boolean;
}

export type BudgetStatusResponse = BudgetStatusItem[];
