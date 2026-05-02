import type { CategoryResponse, TransactionResponse } from '@finance-tracker/shared';
import { Card } from './ui/Card';
import { EmptyState } from './EmptyState';
import { TransactionListItem } from './TransactionListItem';
import { dayKey, formatRelativeDay } from '../lib/format';

interface RecentTransactionsCardProps {
  transactions: TransactionResponse[];
  categories: CategoryResponse[];
}

interface Group {
  key: string;
  label: string;
  items: TransactionResponse[];
}

function groupByDay(transactions: TransactionResponse[]): Group[] {
  const map = new Map<string, Group>();
  for (const transaction of transactions) {
    const key = dayKey(transaction.createdAt);
    let group = map.get(key);
    if (!group) {
      group = { key, label: formatRelativeDay(transaction.createdAt), items: [] };
      map.set(key, group);
    }
    group.items.push(transaction);
  }
  return Array.from(map.values()).sort((a, b) => (a.key < b.key ? 1 : -1));
}

export function RecentTransactionsCard({ transactions, categories }: RecentTransactionsCardProps) {
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const groups = groupByDay(transactions);

  return (
    <Card className="px-5 py-4">
      <div className="flex items-baseline justify-between">
        <h3 className="font-heading text-base font-semibold text-zinc-100">รายการล่าสุด</h3>
        {transactions.length > 0 ? (
          <p className="text-xs text-zinc-500">{transactions.length} รายการ</p>
        ) : null}
      </div>

      {groups.length === 0 ? (
        <EmptyState
          title="ยังไม่มีรายการ"
          description="เริ่มบันทึกรายรับรายจ่ายของคุณได้เลย"
          className="mt-4"
        />
      ) : (
        <div className="mt-2 flex flex-col">
          {groups.map((group) => (
            <section key={group.key} className="border-b border-zinc-800 last:border-b-0">
              <h4 className="pt-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {group.label}
              </h4>
              <ul className="flex flex-col">
                {group.items.map((transaction) => (
                  <TransactionListItem
                    key={transaction.id}
                    transaction={transaction}
                    category={categoryMap.get(transaction.categoryId)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Card>
  );
}
