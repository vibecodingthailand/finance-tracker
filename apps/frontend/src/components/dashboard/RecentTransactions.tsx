import type { TransactionResponse } from "@finance-tracker/shared";
import { TransactionType } from "@finance-tracker/shared";
import { Card } from "../ui/Card";
import { formatBaht, formatThaiDate } from "../../lib/format";

interface RecentTransactionsProps {
  transactions: TransactionResponse[];
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  return (
    <Card className="flex flex-col">
      <header className="border-b border-zinc-800 px-5 py-4">
        <h3 className="font-heading text-base font-bold text-zinc-100">
          รายการล่าสุด
        </h3>
      </header>
      {transactions.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-zinc-500">
          ยังไม่มีรายการ
        </div>
      ) : (
        <ul className="divide-y divide-zinc-800">
          {transactions.map((tx) => (
            <TransactionRow key={tx.id} transaction={tx} />
          ))}
        </ul>
      )}
    </Card>
  );
}

interface TransactionRowProps {
  transaction: TransactionResponse;
}

function TransactionRow({ transaction }: TransactionRowProps) {
  const isIncome = transaction.type === TransactionType.INCOME;
  const amountClass = isIncome ? "text-emerald-400" : "text-rose-400";
  const sign = isIncome ? "+" : "-";

  return (
    <li className="flex items-center gap-4 px-5 py-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-lg">
        {transaction.category.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-100">
          {transaction.description || transaction.category.name}
        </p>
        <p className="text-xs text-zinc-500">
          {transaction.category.name} · {formatThaiDate(transaction.createdAt)}
        </p>
      </div>
      <p className={`font-heading text-sm font-bold ${amountClass}`}>
        {sign}
        {formatBaht(transaction.amount)}
      </p>
    </li>
  );
}
