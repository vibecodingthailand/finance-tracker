import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DailyTotal } from '@finance-tracker/shared';
import { Card } from './ui/Card';
import { EmptyState } from './EmptyState';
import { formatCompactCurrency, formatCurrency } from '../lib/format';

interface DailyBarChartProps {
  data: DailyTotal[];
  className?: string;
}

interface ChartDatum {
  day: number;
  income: number;
  expense: number;
}

function toChartData(data: DailyTotal[]): ChartDatum[] {
  return data.map((entry) => ({
    day: Number(entry.date.slice(8, 10)),
    income: entry.income,
    expense: entry.expense,
  }));
}

export function DailyBarChart({ data, className = '' }: DailyBarChartProps) {
  const isEmpty = data.every((entry) => entry.income === 0 && entry.expense === 0);

  return (
    <Card className={`flex flex-col px-5 py-4 ${className}`}>
      <h3 className="font-heading text-base font-semibold text-zinc-100">รายรับ/รายจ่ายรายวัน</h3>
      {isEmpty ? (
        <EmptyState
          title="ยังไม่มีข้อมูลเดือนนี้"
          description="เพิ่มรายการเพื่อดูแนวโน้มรายวัน"
          className="mt-4 flex-1"
        />
      ) : (
        <div className="mt-3 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={toChartData(data)} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="day"
                stroke="#71717a"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#27272a' }}
                interval="preserveStartEnd"
                minTickGap={8}
              />
              <YAxis
                stroke="#71717a"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#27272a' }}
                tickFormatter={(value: number) => formatCompactCurrency(value)}
                width={60}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: 12,
                }}
                itemStyle={{ color: '#f4f4f5' }}
                labelStyle={{ color: '#a1a1aa', fontWeight: 600 }}
                labelFormatter={(label: number) => `วันที่ ${label}`}
                formatter={(value: number, name: string) => [formatCurrency(value), name]}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{ paddingTop: 8, fontSize: 12, color: '#a1a1aa' }}
              />
              <Bar dataKey="income" fill="#10b981" name="รายรับ" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" fill="#f43f5e" name="รายจ่าย" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
