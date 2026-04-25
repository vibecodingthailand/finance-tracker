import type { CategoryResponse, TransactionResponse } from '@finance-tracker/shared';
import { TransactionType } from '@finance-tracker/shared';
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
      <div className="hidden overflow-hidden rounded-xl border border-zinc-800 sm:block">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900/80 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
            <tr>
              <th className="px-4 py-3">วันที่</th>
              <th className="px-4 py-3">รายละเอียด</th>
              <th className="px-4 py-3">หมวดหมู่</th>
              <th className="px-4 py-3">ประเภท</th>
              <th className="px-4 py-3 text-right">จำนวนเงิน</th>
              <th className="px-4 py-3 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-900">
            {transactions.map((transaction) => {
              const category = categories.get(transaction.categoryId);
              const isIncome = transaction.type === TransactionType.INCOME;
              const description = transaction.description?.trim() || category?.name || 'ไม่ระบุ';
              return (
                <tr key={transaction.id} className="text-zinc-100">
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
                    <TypeBadge type={transaction.type} />
                  </td>
                  <td
                    className={`whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums ${
                      isIncome ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {isIncome ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="inline-flex gap-3">
                      <button
                        type="button"
                        className="text-sm font-medium text-emerald-400 transition hover:text-emerald-300"
                        onClick={() => onEdit(transaction)}
                      >
                        แก้ไข
                      </button>
                      <button
                        type="button"
                        className="text-sm font-medium text-rose-400 transition hover:text-rose-300"
                        onClick={() => onDelete(transaction)}
                      >
                        ลบ
                      </button>
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
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3"
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
                <TypeBadge type={transaction.type} />
                <div className="flex gap-3">
                  <button
                    type="button"
                    className="text-sm font-medium text-emerald-400 transition hover:text-emerald-300"
                    onClick={() => onEdit(transaction)}
                  >
                    แก้ไข
                  </button>
                  <button
                    type="button"
                    className="text-sm font-medium text-rose-400 transition hover:text-rose-300"
                    onClick={() => onDelete(transaction)}
                  >
                    ลบ
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function TypeBadge({ type }: { type: TransactionType }) {
  if (type === TransactionType.INCOME) {
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
        รายรับ
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-xs font-medium text-rose-300">
      รายจ่าย
    </span>
  );
}
