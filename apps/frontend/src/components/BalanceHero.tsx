import type { DailyTotal, SummaryResponse } from '@finance-tracker/shared';
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts';
import { Card } from './ui/Card';
import { TrendingDownIcon, TrendingUpIcon, WalletIcon } from './icons';
import { formatCurrency } from '../lib/format';

interface BalanceHeroProps {
  summary: SummaryResponse;
  prevSummary: SummaryResponse | null;
}

interface DeltaInfo {
  percent: number;
  isPositive: boolean;
}

function computeDelta(current: number, previous: number): DeltaInfo | null {
  if (previous === 0) {
    if (current === 0) return null;
    return { percent: 100, isPositive: current > 0 };
  }
  const change = ((current - previous) / Math.abs(previous)) * 100;
  return { percent: Math.abs(change), isPositive: change >= 0 };
}

function buildSparkline(daily: DailyTotal[]): { day: number; balance: number }[] {
  let cumulative = 0;
  return daily.map((entry, idx) => {
    cumulative += entry.income - entry.expense;
    return { day: idx + 1, balance: cumulative };
  });
}

export function BalanceHero({ summary, prevSummary }: BalanceHeroProps) {
  const delta = prevSummary ? computeDelta(summary.balance, prevSummary.balance) : null;
  const savingsRate =
    summary.totalIncome > 0
      ? Math.max(0, Math.min(100, (summary.balance / summary.totalIncome) * 100))
      : 0;
  const sparkline = buildSparkline(summary.dailyTotals);

  return (
    <Card className="relative overflow-hidden px-5 py-6 sm:px-7 sm:py-7">
      <div className="absolute -right-8 -top-8 hidden h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl sm:block" />

      <div className="relative grid gap-6 sm:grid-cols-[1fr_minmax(0,180px)]">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/20">
              <WalletIcon className="h-4 w-4" />
            </span>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              ยอดคงเหลือเดือนนี้
            </p>
          </div>

          <p className="mt-3 font-heading text-3xl font-bold tabular-nums text-cyan-400 sm:text-4xl">
            {formatCurrency(summary.balance)}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
            {delta ? (
              <span
                className={`inline-flex items-center gap-1 font-medium ${
                  delta.isPositive ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {delta.isPositive ? (
                  <TrendingUpIcon className="h-4 w-4" />
                ) : (
                  <TrendingDownIcon className="h-4 w-4" />
                )}
                {delta.percent.toFixed(1)}% เทียบเดือนก่อน
              </span>
            ) : (
              <span className="text-sm text-zinc-500">ไม่มีข้อมูลเดือนก่อน</span>
            )}
            <span className="text-zinc-500">·</span>
            <span className="text-zinc-400">
              อัตราเก็บออม{' '}
              <span className="font-semibold text-zinc-200 tabular-nums">
                {savingsRate.toFixed(1)}%
              </span>
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <MiniMetric
              label="รายรับ"
              amount={summary.totalIncome}
              tone="income"
              icon={<TrendingUpIcon className="h-4 w-4" />}
            />
            <MiniMetric
              label="รายจ่าย"
              amount={summary.totalExpense}
              tone="expense"
              icon={<TrendingDownIcon className="h-4 w-4" />}
            />
          </div>
        </div>

        {sparkline.length > 1 ? (
          <div className="relative h-24 w-full sm:h-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkline} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="balanceSpark" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis hide domain={['dataMin', 'dataMax']} />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  fill="url(#balanceSpark)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

interface MiniMetricProps {
  label: string;
  amount: number;
  tone: 'income' | 'expense';
  icon: React.ReactNode;
}

function MiniMetric({ label, amount, tone, icon }: MiniMetricProps) {
  const toneClass = tone === 'income' ? 'text-emerald-400' : 'text-rose-400';
  const ringClass =
    tone === 'income'
      ? 'bg-emerald-500/10 ring-emerald-500/20'
      : 'bg-rose-500/10 ring-rose-500/20';
  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2.5">
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ring-1 ${ringClass} ${toneClass}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
        <p className={`text-sm font-semibold tabular-nums ${toneClass}`}>{formatCurrency(amount)}</p>
      </div>
    </div>
  );
}
