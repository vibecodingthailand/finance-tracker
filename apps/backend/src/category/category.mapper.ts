import { Category } from '@finance-tracker/database';
import { CategoryResponse, TransactionType } from '@finance-tracker/shared';

export function toCategoryResponse(c: Category): CategoryResponse {
  return {
    id: c.id,
    name: c.name,
    icon: c.icon,
    type: c.type as TransactionType,
    userId: c.userId,
    createdAt: c.createdAt,
  };
}
