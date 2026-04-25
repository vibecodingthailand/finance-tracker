import type { ReactNode } from 'react';
import { Card } from './ui/Card';
import { formatCurrency } from '../lib/format';

type Tone = 'income' | 'expense' | 'balance';

interface SummaryCardProps {
  label: string;
  amount: number;
  tone: Tone;
  icon: ReactNode;
}

interface ToneStyle {
  text: string;
  badge: string;
}

const toneStyles: Record<Tone, ToneStyle> = {
  income: {
    text: 'text-emerald-400',
    badge: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20',
  },
  expense: {
    text: 'text-rose-400',
    badge: 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20',
  },
  balance: {
    text: 'text-cyan-400',
    badge: 'bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/20',
  },
};

export function SummaryCard({ label, amount, tone, icon }: SummaryCardProps) {
  const { text, badge } = toneStyles[tone];
  return (
    <Card className="flex items-start justify-between gap-4 px-5 py-5">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
        <p className={`mt-2 font-heading text-2xl font-bold tabular-nums sm:text-3xl ${text}`}>
          {formatCurrency(amount)}
        </p>
      </div>
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${badge}`}>
        {icon}
      </span>
    </Card>
  );
}
