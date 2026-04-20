import { Card } from "../ui/Card";
import { formatBaht } from "../../lib/format";

interface SummaryCardsProps {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export function SummaryCards({
  totalIncome,
  totalExpense,
  balance,
}: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <StatCard
        label="รายรับรวม"
        amount={totalIncome}
        amountClassName="text-emerald-400"
        borderClassName="border-l-4 border-l-emerald-500"
      />
      <StatCard
        label="รายจ่ายรวม"
        amount={totalExpense}
        amountClassName="text-rose-400"
        borderClassName="border-l-4 border-l-rose-500"
      />
      <StatCard
        label="คงเหลือ"
        amount={balance}
        amountClassName="text-sky-400"
        borderClassName="border-l-4 border-l-sky-500"
      />
    </div>
  );
}

interface StatCardProps {
  label: string;
  amount: number;
  amountClassName: string;
  borderClassName: string;
}

function StatCard({
  label,
  amount,
  amountClassName,
  borderClassName,
}: StatCardProps) {
  return (
    <Card className={`p-5 ${borderClassName}`}>
      <p className="text-sm font-medium text-zinc-400">{label}</p>
      <p className={`mt-2 font-heading text-2xl font-bold ${amountClassName}`}>
        {formatBaht(amount)}
      </p>
    </Card>
  );
}
