import { Pencil, Trash2 } from "lucide-react";
import type { TransactionResponse } from "@finance-tracker/shared";
import { TransactionType } from "@finance-tracker/shared";
import { formatBaht, formatThaiDate } from "../../lib/format";

interface TransactionTableProps {
  transactions: TransactionResponse[];
  onEdit: (tx: TransactionResponse) => void;
  onDelete: (tx: TransactionResponse) => void;
}

export function TransactionTable({
  transactions,
  onEdit,
  onDelete,
}: TransactionTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/60 px-6 py-16 text-center text-sm text-zinc-500">
        ยังไม่มีรายการตรงตามเงื่อนไข
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-lg">
      <ul className="divide-y divide-zinc-800 md:hidden">
        {transactions.map((tx) => (
          <TransactionCard
            key={tx.id}
            transaction={tx}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </ul>

      <table className="hidden w-full text-left text-sm md:table">
        <thead className="border-b border-zinc-800 bg-zinc-900/60 text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-4 py-3 font-medium">วันที่</th>
            <th className="px-4 py-3 font-medium">รายการ</th>
            <th className="px-4 py-3 font-medium">หมวด</th>
            <th className="px-4 py-3 font-medium">ประเภท</th>
            <th className="px-4 py-3 text-right font-medium">จำนวน</th>
            <th className="px-4 py-3 text-right font-medium">จัดการ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {transactions.map((tx) => (
            <TransactionRow
              key={tx.id}
              transaction={tx}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface RowProps {
  transaction: TransactionResponse;
  onEdit: (tx: TransactionResponse) => void;
  onDelete: (tx: TransactionResponse) => void;
}

function TransactionRow({ transaction, onEdit, onDelete }: RowProps) {
  const isIncome = transaction.type === TransactionType.INCOME;
  const amountClass = isIncome ? "text-emerald-400" : "text-rose-400";
  const sign = isIncome ? "+" : "-";

  return (
    <tr className="text-zinc-200 transition duration-200 hover:bg-zinc-800/40">
      <td className="px-4 py-3 text-zinc-400">
        {formatThaiDate(transaction.createdAt)}
      </td>
      <td className="px-4 py-3">
        <p className="truncate font-medium">
          {transaction.description || transaction.category.name}
        </p>
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center gap-2 rounded-md bg-zinc-800 px-2 py-1 text-xs">
          <span aria-hidden>{transaction.category.icon}</span>
          <span>{transaction.category.name}</span>
        </span>
      </td>
      <td className="px-4 py-3">
        <TypeBadge type={transaction.type} />
      </td>
      <td className={`px-4 py-3 text-right font-heading font-bold ${amountClass}`}>
        {sign}
        {formatBaht(transaction.amount)}
      </td>
      <td className="px-4 py-3">
        <RowActions
          onEdit={() => onEdit(transaction)}
          onDelete={() => onDelete(transaction)}
        />
      </td>
    </tr>
  );
}

function TransactionCard({ transaction, onEdit, onDelete }: RowProps) {
  const isIncome = transaction.type === TransactionType.INCOME;
  const amountClass = isIncome ? "text-emerald-400" : "text-rose-400";
  const sign = isIncome ? "+" : "-";

  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-lg"
            aria-hidden
          >
            {transaction.category.icon}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-100">
              {transaction.description || transaction.category.name}
            </p>
            <p className="text-xs text-zinc-500">
              {transaction.category.name} ·{" "}
              {formatThaiDate(transaction.createdAt)}
            </p>
          </div>
        </div>
        <p className={`font-heading text-sm font-bold ${amountClass}`}>
          {sign}
          {formatBaht(transaction.amount)}
        </p>
      </div>
      <div className="flex items-center justify-between">
        <TypeBadge type={transaction.type} />
        <RowActions
          onEdit={() => onEdit(transaction)}
          onDelete={() => onDelete(transaction)}
        />
      </div>
    </li>
  );
}

function TypeBadge({ type }: { type: TransactionType }) {
  const isIncome = type === TransactionType.INCOME;
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isIncome
          ? "bg-emerald-500/15 text-emerald-300"
          : "bg-rose-500/15 text-rose-300"
      }`}
    >
      {isIncome ? "รายรับ" : "รายจ่าย"}
    </span>
  );
}

interface RowActionsProps {
  onEdit: () => void;
  onDelete: () => void;
}

function RowActions({ onEdit, onDelete }: RowActionsProps) {
  return (
    <div className="flex justify-end gap-1">
      <button
        type="button"
        onClick={onEdit}
        aria-label="แก้ไข"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition duration-200 hover:bg-zinc-800 hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
      >
        <Pencil size={16} />
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label="ลบ"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition duration-200 hover:bg-zinc-800 hover:text-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
