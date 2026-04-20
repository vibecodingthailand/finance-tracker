import { TransactionType } from "./transaction-type";

export interface CategoryResponse {
  id: string;
  name: string;
  icon: string;
  type: TransactionType;
  userId: string | null;
}
