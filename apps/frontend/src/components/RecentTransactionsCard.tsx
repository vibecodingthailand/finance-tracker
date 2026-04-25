import type { CategoryResponse, TransactionResponse } from '@finance-tracker/shared';
import { Card } from './ui/Card';
import { EmptyState } from './EmptyState';
import { TransactionListItem } from './TransactionListItem';

interface RecentTransactionsCardProps {
  transactions: TransactionResponse[];
  categories: CategoryResponse[];
}

export function RecentTransactionsCard({ transactions, categories }: RecentTransactionsCardProps) {
  const categoryMap = new Map(categories.map((category) => [category.id, category]));

  return (
    <Card className="px-5 py-4">
      <h3 className="font-heading text-base font-semibold text-zinc-100">รายการล่าสุด</h3>
      {transactions.length === 0 ? (
        <EmptyState
          title="ยังไม่มีรายการ"
          description="เริ่มบันทึกรายรับรายจ่ายของคุณได้เลย"
          className="mt-4"
        />
      ) : (
        <ul className="mt-2 flex flex-col">
          {transactions.map((transaction) => (
            <TransactionListItem
              key={transaction.id}
              transaction={transaction}
              category={categoryMap.get(transaction.categoryId)}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}
