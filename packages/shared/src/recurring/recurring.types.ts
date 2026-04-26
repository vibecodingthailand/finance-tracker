import { TransactionType } from '../common/transaction-type.enum';

export interface RecurringResponse {
  id: string;
  amount: number;
  type: TransactionType;
  description: string | null;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  userId: string;
  dayOfMonth: number;
  active: boolean;
  createdAt: Date;
}
