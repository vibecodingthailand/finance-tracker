import type { CategoryBreakdown } from '@finance-tracker/shared';
import { Card } from './ui/Card';
import { EmptyState } from './EmptyState';
import { formatCurrency } from '../lib/format';

interface TopCategoriesCardProps {
  data: CategoryBreakdown[];
  className?: string;
  limit?: number;
}

export function TopCategoriesCard({ data, className = '', limit = 5 }: TopCategoriesCardProps) {
  const top = [...data].sort((a, b) => b.total - a.total).slice(0, limit);
  const max = top[0]?.total ?? 0;

  return (
    <Card className={`flex flex-col px-5 py-4 ${className}`}>
      <div className="flex items-baseline justify-between">
        <h3 className="font-heading text-base font-semibold text-zinc-100">หมวดที่จ่ายมากสุด</h3>
        <p className="text-xs text-zinc-500">{data.length} หมวด</p>
      </div>

      {top.length === 0 ? (
        <EmptyState
          title="ยังไม่มีรายจ่ายเดือนนี้"
          description="เพิ่มรายการเพื่อดูหมวดที่ใช้มากสุด"
          className="mt-4 flex-1"
        />
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {top.map((item) => {
            const width = max === 0 ? 0 : Math.max(4, (item.total / max) * 100);
            return (
              <li key={item.name} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm">
                      {item.icon}
                    </span>
                    <span className="truncate text-zinc-200">{item.name}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-zinc-300">
                    {formatCurrency(item.total)}
                    <span className="ml-1.5 text-xs text-zinc-500">{item.percentage}%</span>
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-rose-400/80 transition-all duration-500"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
