import type { CategoryResponse, TransactionResponse } from '@finance-tracker/shared';
import { TransactionType } from '@finance-tracker/shared';
import { formatCurrency, formatDate } from '../lib/format';

interface TransactionListItemProps {
  transaction: TransactionResponse;
  category: CategoryResponse | undefined;
}

export function TransactionListItem({ transaction, category }: TransactionListItemProps) {
  const isIncome = transaction.type === TransactionType.INCOME;
  const amountClass = isIncome ? 'text-emerald-400' : 'text-rose-400';
  const sign = isIncome ? '+' : '-';
  const title = transaction.description?.trim() || category?.name || 'ไม่ระบุ';

  return (
    <li className="flex items-center justify-between gap-3 border-b border-zinc-800 py-3 last:border-b-0">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-base">
          {category?.icon ?? '•'}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-100">{title}</p>
          <p className="truncate text-xs text-zinc-500">
            {(category?.name ?? 'ไม่ระบุหมวดหมู่')} · {formatDate(transaction.createdAt)}
          </p>
        </div>
      </div>
      <span className={`shrink-0 font-medium tabular-nums ${amountClass}`}>
        {sign}
        {formatCurrency(transaction.amount)}
      </span>
    </li>
  );
}
