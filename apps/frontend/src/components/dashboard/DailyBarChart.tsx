import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyTotal } from "@finance-tracker/shared";
import { Card } from "../ui/Card";
import { EmptyChart } from "./EmptyChart";
import {
  dayOfMonthFromIsoDate,
  formatBaht,
  formatBahtCompact,
  formatThaiDate,
} from "../../lib/format";

interface DailyBarChartProps {
  data: DailyTotal[];
}

interface ChartPoint {
  day: string;
  date: string;
  income: number;
  expense: number;
}

export function DailyBarChart({ data }: DailyBarChartProps) {
  const hasData = data.some((d) => d.income > 0 || d.expense > 0);
  const points: ChartPoint[] = data.map((d) => ({
    day: dayOfMonthFromIsoDate(d.date),
    date: d.date,
    income: d.income,
    expense: d.expense,
  }));

  return (
    <Card className="flex flex-col gap-4 p-5">
      <h3 className="font-heading text-base font-bold text-zinc-100">
        รายรับ-รายจ่ายรายวัน
      </h3>
      {hasData ? (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart
              data={points}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="day"
                tick={{ fill: "#a1a1aa", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "#3f3f46" }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "#a1a1aa", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "#3f3f46" }}
                tickFormatter={formatBahtCompact}
                width={56}
              />
              <Tooltip content={<BarTooltip />} cursor={{ fill: "#27272a66" }} />
              <Legend content={<BarLegend />} />
              <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyChart message="ยังไม่มีข้อมูลเดือนนี้" />
      )}
    </Card>
  );
}

interface BarTooltipPayload {
  dataKey: string;
  value: number;
  payload: ChartPoint;
}

function BarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: BarTooltipPayload[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  const income = payload.find((p) => p.dataKey === "income")?.value ?? 0;
  const expense = payload.find((p) => p.dataKey === "expense")?.value ?? 0;
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-zinc-100">{formatThaiDate(point.date)}</p>
      <p className="mt-1 text-emerald-400">รายรับ {formatBaht(income)}</p>
      <p className="text-rose-400">รายจ่าย {formatBaht(expense)}</p>
    </div>
  );
}

function BarLegend() {
  return (
    <ul className="mt-3 flex gap-4 text-xs text-zinc-300">
      <li className="flex items-center gap-2">
        <svg width="10" height="10" aria-hidden="true">
          <rect width="10" height="10" rx="2" fill="#10b981" />
        </svg>
        รายรับ
      </li>
      <li className="flex items-center gap-2">
        <svg width="10" height="10" aria-hidden="true">
          <rect width="10" height="10" rx="2" fill="#f43f5e" />
        </svg>
        รายจ่าย
      </li>
    </ul>
  );
}
