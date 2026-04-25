import { TransactionType } from '../common/transaction-type.enum';

export interface CategoryResponse {
  id: string;
  name: string;
  icon: string;
  type: TransactionType;
  userId: string | null;
  createdAt: Date;
}
