import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { CategoryBreakdown } from '@finance-tracker/shared';
import { Card } from './ui/Card';
import { EmptyState } from './EmptyState';
import { formatCurrency } from '../lib/format';

type Palette = 'expense' | 'income';

interface CategoryPieChartProps {
  title: string;
  data: CategoryBreakdown[];
  palette: Palette;
  className?: string;
}

interface PaletteEntry {
  hex: string;
  dotClass: string;
}

const palettes: Record<Palette, PaletteEntry[]> = {
  expense: [
    { hex: '#f43f5e', dotClass: 'bg-rose-500' },
    { hex: '#f97316', dotClass: 'bg-orange-500' },
    { hex: '#fb923c', dotClass: 'bg-orange-400' },
    { hex: '#f59e0b', dotClass: 'bg-amber-500' },
    { hex: '#dc2626', dotClass: 'bg-red-600' },
    { hex: '#fbbf24', dotClass: 'bg-amber-400' },
    { hex: '#fda4af', dotClass: 'bg-rose-300' },
  ],
  income: [
    { hex: '#10b981', dotClass: 'bg-emerald-500' },
    { hex: '#06b6d4', dotClass: 'bg-cyan-500' },
    { hex: '#14b8a6', dotClass: 'bg-teal-500' },
    { hex: '#22c55e', dotClass: 'bg-green-500' },
    { hex: '#0ea5e9', dotClass: 'bg-sky-500' },
    { hex: '#3b82f6', dotClass: 'bg-blue-500' },
    { hex: '#84cc16', dotClass: 'bg-lime-500' },
  ],
};

function paletteEntry(palette: Palette, idx: number): PaletteEntry {
  const entries = palettes[palette];
  return entries[idx % entries.length] ?? entries[0]!;
}

export function CategoryPieChart({ title, data, palette, className = '' }: CategoryPieChartProps) {
  const isEmpty = data.length === 0;

  return (
    <Card className={`flex flex-col px-5 py-4 ${className}`}>
      <h3 className="font-heading text-base font-semibold text-zinc-100">{title}</h3>
      {isEmpty ? (
        <EmptyState
          title="ยังไม่มีข้อมูลเดือนนี้"
          description="เพิ่มรายการเพื่อดูสัดส่วนตามหมวดหมู่"
          className="mt-4 flex-1"
        />
      ) : (
        <>
          <div className="mt-3 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="total"
                  nameKey="name"
                  innerRadius="55%"
                  outerRadius="85%"
                  paddingAngle={1}
                  stroke="#09090b"
                  strokeWidth={2}
                  isAnimationActive={false}
                  label={(entry: { percentage: number }) =>
                    entry.percentage >= 5 ? `${entry.percentage}%` : ''
                  }
                  labelLine={false}
                >
                  {data.map((item, idx) => (
                    <Cell key={item.name} fill={paletteEntry(palette, idx).hex} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid #27272a',
                    borderRadius: 12,
                    color: '#f4f4f5',
                  }}
                  formatter={(value: number, _name: string, item) => {
                    const payload = item.payload as CategoryBreakdown;
                    return [`${formatCurrency(value)} (${payload.percentage}%)`, payload.name];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-4 flex flex-col gap-1.5 text-xs">
            {data.map((item, idx) => (
              <li key={item.name} className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${paletteEntry(palette, idx).dotClass}`} />
                  <span className="truncate text-zinc-300">{item.name}</span>
                </span>
                <span className="shrink-0 tabular-nums text-zinc-400">
                  {formatCurrency(item.total)} · {item.percentage}%
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
