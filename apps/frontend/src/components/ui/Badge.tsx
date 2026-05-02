import type { ReactNode } from 'react';

type BadgeTone = 'income' | 'expense' | 'neutral' | 'info' | 'warning' | 'danger';

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

const toneClass: Record<BadgeTone, string> = {
  income: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
  expense: 'bg-rose-500/10 text-rose-400 ring-rose-500/20',
  neutral: 'bg-zinc-800 text-zinc-300 ring-zinc-700',
  info: 'bg-cyan-500/10 text-cyan-400 ring-cyan-500/20',
  warning: 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
  danger: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
};

export function Badge({ tone = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${toneClass[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
