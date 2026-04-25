import { Card } from './ui/Card';
import { formatCurrency } from '../lib/format';

type Tone = 'income' | 'expense' | 'balance';

interface SummaryCardProps {
  label: string;
  amount: number;
  tone: Tone;
}

const toneClasses: Record<Tone, string> = {
  income: 'text-emerald-400',
  expense: 'text-rose-400',
  balance: 'text-cyan-400',
};

export function SummaryCard({ label, amount, tone }: SummaryCardProps) {
  return (
    <Card className="px-5 py-4">
      <p className="text-sm font-medium text-zinc-400">{label}</p>
      <p className={`mt-2 font-heading text-2xl font-bold tabular-nums sm:text-3xl ${toneClasses[tone]}`}>
        {formatCurrency(amount)}
      </p>
    </Card>
  );
}
