export const TransactionType = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
} as const;

export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];
