import type { DailyTotal, SummaryResponse } from '@finance-tracker/shared';
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
import { Card } from './ui/Card';
import { TrendingDownIcon, TrendingUpIcon, WalletIcon } from './icons';
import { formatCurrency } from '../lib/format';

interface BalanceHeroProps {
  summary: SummaryResponse;
  prevSummary: SummaryResponse | null;
  month: number;
  year: number;
}

interface DeltaInfo {
  percent: number;
  isPositive: boolean;
}

interface SparkPoint {
  day: number;
  balance: number;
}

function computeDelta(current: number, previous: number): DeltaInfo | null {
  if (previous === 0) {
    if (current === 0) return null;
    return { percent: 100, isPositive: current > 0 };
  }
  const change = ((current - previous) / Math.abs(previous)) * 100;
  return { percent: Math.abs(change), isPositive: change >= 0 };
}

function buildSparkline(daily: DailyTotal[], month: number, year: number): SparkPoint[] {
  const now = new Date();
  const isCurrentMonth = now.getMonth() + 1 === month && now.getFullYear() === year;
  const lastDay = isCurrentMonth ? now.getDate() : daily.length;
  let cumulative = 0;
  const points: SparkPoint[] = [];
  for (let i = 0; i < daily.length && i < lastDay; i += 1) {
    const entry = daily[i]!;
    cumulative += entry.income - entry.expense;
    points.push({ day: i + 1, balance: cumulative });
  }
  return points;
}

function hasMeaningfulMovement(points: SparkPoint[]): boolean {
  if (points.length < 2) return false;
  const min = Math.min(...points.map((p) => p.balance));
  const max = Math.max(...points.map((p) => p.balance));
  return max - min > 0;
}

interface SparkTooltipPayload {
  payload: SparkPoint;
}

function SparkTooltip({ active, payload }: { active?: boolean; payload?: SparkTooltipPayload[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/95 px-2.5 py-1.5 text-xs shadow-lg">
      <p className="text-zinc-500">วันที่ {point.day}</p>
      <p className="font-semibold tabular-nums text-cyan-400">{formatCurrency(point.balance)}</p>
    </div>
  );
}

export function BalanceHero({ summary, prevSummary, month, year }: BalanceHeroProps) {
  const delta = prevSummary ? computeDelta(summary.balance, prevSummary.balance) : null;
  const savingsRate =
    summary.totalIncome > 0
      ? Math.max(0, Math.min(100, (summary.balance / summary.totalIncome) * 100))
      : 0;
  const sparkline = buildSparkline(summary.dailyTotals, month, year);
  const showSparkline = hasMeaningfulMovement(sparkline);

  return (
    <Card className="relative overflow-hidden px-5 py-6 sm:px-7 sm:py-7">
      <div className="absolute -right-8 -top-8 hidden h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl sm:block" />

      <div className="relative grid gap-6 sm:grid-cols-[1fr_minmax(0,220px)]">
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

        {showSparkline ? (
          <SparklinePanel points={sparkline} />
        ) : (
          <div className="hidden h-full min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 px-4 py-6 text-center sm:flex">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              ยอดสะสมรายวัน
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              เพิ่มรายการเพื่อดูแนวโน้ม
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

function SparklinePanel({ points }: { points: SparkPoint[] }) {
  const start = points[0]?.balance ?? 0;
  const end = points[points.length - 1]?.balance ?? 0;
  const peak = points.reduce((max, p) => (p.balance > max.balance ? p : max), points[0]!);
  const trough = points.reduce((min, p) => (p.balance < min.balance ? p : min), points[0]!);

  return (
    <div className="flex h-full min-h-[180px] flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-3">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          ยอดสะสมรายวัน
        </p>
        <p className="text-[11px] tabular-nums text-zinc-500">
          วันที่ {points[0]?.day ?? 1}–{points[points.length - 1]?.day ?? 1}
        </p>
      </div>
      <div className="relative w-full flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="balanceSpark" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis hide domain={['dataMin', 'dataMax']} />
            <Tooltip
              cursor={{ stroke: '#27272a', strokeDasharray: '3 3' }}
              content={<SparkTooltip />}
            />
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
      <div className="flex items-baseline justify-between text-[11px] tabular-nums">
        <span className="text-zinc-500">
          เริ่ม <span className="text-zinc-300">{formatCurrency(start)}</span>
        </span>
        <span className={end >= start ? 'text-emerald-400' : 'text-rose-400'}>
          ล่าสุด {formatCurrency(end)}
        </span>
      </div>
      <p className="text-[11px] text-zinc-500">
        สูงสุด {formatCurrency(peak.balance)} (วันที่ {peak.day})
        <span className="mx-1">·</span>
        ต่ำสุด {formatCurrency(trough.balance)} (วันที่ {trough.day})
      </p>
    </div>
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
