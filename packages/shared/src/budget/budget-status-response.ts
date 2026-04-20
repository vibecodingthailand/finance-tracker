export interface BudgetStatusItem {
  categoryName: string;
  categoryIcon: string;
  budgetAmount: number;
  spentAmount: number;
  percentage: number;
  isOverBudget: boolean;
}

export type BudgetStatusResponse = BudgetStatusItem[];
