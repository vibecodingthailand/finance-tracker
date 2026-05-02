import type { CategoryResponse, TransactionResponse } from '@finance-tracker/shared';
import { TransactionType } from '@finance-tracker/shared';
import { Badge } from './ui/Badge';
import { IconButton } from './ui/IconButton';
import { PencilIcon, TrashIcon } from './icons';
import { formatCurrency, formatDate } from '../lib/format';

interface TransactionsTableProps {
  transactions: TransactionResponse[];
  categories: Map<string, CategoryResponse>;
  onEdit: (transaction: TransactionResponse) => void;
  onDelete: (transaction: TransactionResponse) => void;
}

export function TransactionsTable({
  transactions,
  categories,
  onEdit,
  onDelete,
}: TransactionsTableProps) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-lg sm:block">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900/80 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">วันที่</th>
              <th className="px-4 py-3 font-medium">รายละเอียด</th>
              <th className="px-4 py-3 font-medium">หมวดหมู่</th>
              <th className="px-4 py-3 font-medium">ประเภท</th>
              <th className="px-4 py-3 text-right font-medium">จำนวนเงิน</th>
              <th className="px-4 py-3 text-right font-medium">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {transactions.map((transaction) => {
              const category = categories.get(transaction.categoryId);
              const isIncome = transaction.type === TransactionType.INCOME;
              const description = transaction.description?.trim() || category?.name || 'ไม่ระบุ';
              return (
                <tr key={transaction.id} className="text-zinc-100 transition hover:bg-zinc-800/30">
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-400">
                    {formatDate(transaction.createdAt)}
                  </td>
                  <td className="px-4 py-3">{description}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2 text-zinc-300">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 text-sm">
                        {category?.icon ?? '•'}
                      </span>
                      {category?.name ?? 'ไม่ระบุ'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={isIncome ? 'income' : 'expense'}>
                      {isIncome ? 'รายรับ' : 'รายจ่าย'}
                    </Badge>
                  </td>
                  <td
                    className={`whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums ${
                      isIncome ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {isIncome ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <IconButton
                        size="sm"
                        tone="accent"
                        label="แก้ไข"
                        onClick={() => onEdit(transaction)}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </IconButton>
                      <IconButton
                        size="sm"
                        tone="danger"
                        label="ลบ"
                        onClick={() => onDelete(transaction)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 sm:hidden">
        {transactions.map((transaction) => {
          const category = categories.get(transaction.categoryId);
          const isIncome = transaction.type === TransactionType.INCOME;
          const description = transaction.description?.trim() || category?.name || 'ไม่ระบุ';
          return (
            <li
              key={transaction.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-base">
                    {category?.icon ?? '•'}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-100">{description}</p>
                    <p className="truncate text-xs text-zinc-500">
                      {(category?.name ?? 'ไม่ระบุ')} · {formatDate(transaction.createdAt)}
                    </p>
                  </div>
                </div>
                <span
                  className={`shrink-0 text-sm font-semibold tabular-nums ${
                    isIncome ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {isIncome ? '+' : '-'}
                  {formatCurrency(transaction.amount)}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <Badge tone={isIncome ? 'income' : 'expense'}>
                  {isIncome ? 'รายรับ' : 'รายจ่าย'}
                </Badge>
                <div className="flex gap-1">
                  <IconButton
                    size="sm"
                    tone="accent"
                    label="แก้ไข"
                    onClick={() => onEdit(transaction)}
                  >
                    <PencilIcon className="h-4 w-4" />
                  </IconButton>
                  <IconButton
                    size="sm"
                    tone="danger"
                    label="ลบ"
                    onClick={() => onDelete(transaction)}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </IconButton>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
