import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { CategoryBreakdown } from "@finance-tracker/shared";
import { Card } from "../ui/Card";
import { EmptyChart } from "./EmptyChart";
import { formatBaht } from "../../lib/format";

interface CategoryPieChartProps {
  title: string;
  data: CategoryBreakdown[];
  palette: string[];
  emptyMessage?: string;
}

export function CategoryPieChart({
  title,
  data,
  palette,
  emptyMessage = "ยังไม่มีข้อมูลเดือนนี้",
}: CategoryPieChartProps) {
  const hasData = data.length > 0 && data.some((d) => d.total > 0);

  return (
    <Card className="flex flex-col gap-4 p-5">
      <h3 className="font-heading text-base font-bold text-zinc-100">
        {title}
      </h3>
      {hasData ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="total"
                nameKey="name"
                innerRadius={48}
                outerRadius={88}
                paddingAngle={2}
                stroke="none"
                label={renderSliceLabel}
                labelLine={false}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={palette[index % palette.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend content={<PieLegend palette={palette} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyChart message={emptyMessage} />
      )}
    </Card>
  );
}

type SliceLabelProps = {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
};

function renderSliceLabel({
  cx = 0,
  cy = 0,
  midAngle = 0,
  innerRadius = 0,
  outerRadius = 0,
  percent = 0,
}: SliceLabelProps) {
  if (percent < 0.06) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="#fafafa"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={12}
      fontWeight={600}
    >
      {Math.round(percent * 100)}%
    </text>
  );
}

interface PieTooltipPayload {
  name: string;
  value: number;
  payload: CategoryBreakdown;
}

function PieTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: PieTooltipPayload[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0].payload;
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-zinc-100">
        {entry.icon} {entry.name}
      </p>
      <p className="mt-1 text-zinc-300">{formatBaht(entry.total)}</p>
      <p className="text-zinc-500">{entry.percentage.toFixed(1)}%</p>
    </div>
  );
}

interface PieLegendProps {
  payload?: { value: string; payload: { payload: CategoryBreakdown } }[];
  palette: string[];
}

function PieLegend({ payload, palette }: PieLegendProps) {
  if (!payload) return null;
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-300">
      {payload.map((item, index) => {
        const breakdown = item.payload.payload;
        return (
          <li key={item.value} className="flex items-center gap-2">
            <svg width="10" height="10" aria-hidden="true">
              <circle
                cx="5"
                cy="5"
                r="5"
                fill={palette[index % palette.length]}
              />
            </svg>
            <span className="text-zinc-200">{breakdown.icon}</span>
            <span>{breakdown.name}</span>
            <span className="text-zinc-500">
              {breakdown.percentage.toFixed(0)}%
            </span>
          </li>
        );
      })}
    </ul>
  );
}
