import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BudgetStatusItem, BudgetStatusResponse, CategoryResponse } from '@finance-tracker/shared';
import { TransactionType } from '@finance-tracker/shared';
import { BudgetFormModal } from '../components/BudgetFormModal';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';
import { PageHeader } from '../components/PageHeader';
import { PencilIcon, PlusIcon } from '../components/icons';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { IconButton } from '../components/ui/IconButton';
import { ApiError, apiFetch } from '../lib/api';
import { formatCurrency, THAI_MONTH_NAMES } from '../lib/format';

interface BudgetRow {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  budgetId: string | null;
  budgetAmount: number;
  spentAmount: number;
  percentage: number;
  isOverBudget: boolean;
}

type ModalState =
  | { kind: 'closed' }
  | { kind: 'set'; categoryId: string; categoryName: string }
  | { kind: 'edit'; budgetId: string; categoryName: string; currentAmount: number };

type RowStatus = 'overBudget' | 'critical' | 'warn' | 'safe' | 'unset';

function rowStatus(row: BudgetRow): RowStatus {
  if (!row.budgetId) return 'unset';
  if (row.isOverBudget || row.percentage > 100) return 'overBudget';
  if (row.percentage >= 80) return 'critical';
  if (row.percentage >= 60) return 'warn';
  return 'safe';
}

function barColorClass(status: RowStatus): string {
  switch (status) {
    case 'overBudget':
      return 'bg-rose-500';
    case 'critical':
      return 'bg-orange-400';
    case 'warn':
      return 'bg-amber-400';
    default:
      return 'bg-emerald-500';
  }
}

function textColorClass(status: RowStatus): string {
  switch (status) {
    case 'overBudget':
      return 'text-rose-400';
    case 'critical':
      return 'text-orange-400';
    case 'warn':
      return 'text-amber-400';
    case 'safe':
      return 'text-emerald-400';
    default:
      return 'text-zinc-500';
  }
}

const statusOrder: Record<RowStatus, number> = {
  overBudget: 0,
  critical: 1,
  warn: 2,
  safe: 3,
  unset: 4,
};

export function Budget() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [items, setItems] = useState<BudgetStatusItem[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ kind: 'closed' });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      apiFetch<BudgetStatusResponse>(`/api/budgets/status?month=${month}&year=${year}`),
      apiFetch<CategoryResponse[]>('/api/categories'),
    ])
      .then(([statusData, catData]) => {
        if (cancelled) return;
        setItems(statusData);
        setCategories(catData.filter((c) => c.type === TransactionType.EXPENSE));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'โหลดข้อมูลงบประมาณไม่สำเร็จ');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [month, year, refreshKey]);

  const budgetByCategoryId = useMemo(() => {
    const map = new Map<string, BudgetStatusItem>();
    for (const item of items) {
      map.set(item.categoryId, item);
    }
    return map;
  }, [items]);

  const rows = useMemo<BudgetRow[]>(
    () =>
      categories.map((cat) => {
        const budget = budgetByCategoryId.get(cat.id);
        return budget
          ? {
              categoryId: cat.id,
              categoryName: cat.name,
              categoryIcon: cat.icon,
              budgetId: budget.id,
              budgetAmount: budget.budgetAmount,
              spentAmount: budget.spentAmount,
              percentage: budget.percentage,
              isOverBudget: budget.isOverBudget,
            }
          : {
              categoryId: cat.id,
              categoryName: cat.name,
              categoryIcon: cat.icon,
              budgetId: null,
              budgetAmount: 0,
              spentAmount: 0,
              percentage: 0,
              isOverBudget: false,
            };
      }),
    [categories, budgetByCategoryId],
  );

  const sortedRows = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const statusDiff = statusOrder[rowStatus(a)] - statusOrder[rowStatus(b)];
        if (statusDiff !== 0) return statusDiff;
        return b.percentage - a.percentage;
      }),
    [rows],
  );

  const totals = useMemo(() => {
    let totalBudget = 0;
    let totalSpent = 0;
    let withBudget = 0;
    let overCount = 0;
    for (const row of rows) {
      if (row.budgetId !== null) {
        withBudget += 1;
        totalBudget += row.budgetAmount;
        totalSpent += row.spentAmount;
        if (rowStatus(row) === 'overBudget') overCount += 1;
      }
    }
    const percentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    return { totalBudget, totalSpent, withBudget, overCount, percentage };
  }, [rows]);

  const handleSuccess = useCallback(() => {
    setModal({ kind: 'closed' });
    setRefreshKey((v) => v + 1);
  }, []);

  const modalCategoryId = modal.kind === 'set' ? modal.categoryId : '';
  const modalCategoryName = modal.kind !== 'closed' ? modal.categoryName : '';
  const modalBudgetId = modal.kind === 'edit' ? modal.budgetId : undefined;
  const modalCurrentAmount = modal.kind === 'edit' ? modal.currentAmount : undefined;

  return (
    <div className="flex flex-col gap-6 animate-[fadeIn_300ms_ease-out]">
      <PageHeader title="งบประมาณ" subtitle={`${THAI_MONTH_NAMES[month - 1]} ${year}`} />

      {error ? <ErrorState message={error} /> : null}

      {loading ? (
        <LoadingState variant="list" rows={4} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="ยังไม่มีหมวดหมู่รายจ่าย"
          description="เพิ่มหมวดหมู่รายจ่ายก่อนเพื่อตั้งงบประมาณ"
        />
      ) : (
        <>
          <BudgetOverviewCard totals={totals} />
          <ul className="flex flex-col gap-3">
            {sortedRows.map((row) => (
              <BudgetItemRow
                key={row.categoryId}
                row={row}
                onSet={() =>
                  setModal({
                    kind: 'set',
                    categoryId: row.categoryId,
                    categoryName: row.categoryName,
                  })
                }
                onEdit={() => {
                  if (row.budgetId !== null) {
                    setModal({
                      kind: 'edit',
                      budgetId: row.budgetId,
                      categoryName: row.categoryName,
                      currentAmount: row.budgetAmount,
                    });
                  }
                }}
              />
            ))}
          </ul>
        </>
      )}

      <BudgetFormModal
        open={modal.kind !== 'closed'}
        onClose={() => setModal({ kind: 'closed' })}
        onSuccess={handleSuccess}
        categoryId={modalCategoryId}
        categoryName={modalCategoryName}
        month={month}
        year={year}
        currentAmount={modalCurrentAmount}
        budgetId={modalBudgetId}
      />
    </div>
  );
}

interface BudgetOverviewCardProps {
  totals: {
    totalBudget: number;
    totalSpent: number;
    withBudget: number;
    overCount: number;
    percentage: number;
  };
}

function BudgetOverviewCard({ totals }: BudgetOverviewCardProps) {
  const { totalBudget, totalSpent, withBudget, overCount, percentage } = totals;
  if (withBudget === 0) {
    return (
      <Card className="flex items-start justify-between gap-4 px-5 py-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            ภาพรวมงบประมาณเดือนนี้
          </p>
          <p className="mt-1 text-sm text-zinc-400">ยังไม่ได้ตั้งงบ — เริ่มจากหมวดที่จ่ายบ่อยที่สุด</p>
        </div>
      </Card>
    );
  }

  const status: RowStatus =
    percentage > 100 ? 'overBudget' : percentage >= 80 ? 'critical' : percentage >= 60 ? 'warn' : 'safe';
  const remaining = totalBudget - totalSpent;
  const barWidth = Math.min(percentage, 100);

  return (
    <Card className="flex flex-col gap-4 px-5 py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            ภาพรวมงบประมาณเดือนนี้
          </p>
          <p className="mt-1 font-heading text-2xl font-bold tabular-nums text-zinc-100 sm:text-3xl">
            {formatCurrency(totalSpent)}{' '}
            <span className="text-base font-medium text-zinc-500">
              / {formatCurrency(totalBudget)}
            </span>
          </p>
          <p className={`mt-1 text-sm font-semibold tabular-nums ${textColorClass(status)}`}>
            ใช้ไป {percentage.toFixed(1)}%
            {remaining >= 0
              ? ` · เหลือ ${formatCurrency(remaining)}`
              : ` · เกิน ${formatCurrency(Math.abs(remaining))}`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 text-right">
          <Badge tone="info">ตั้งงบ {withBudget} หมวด</Badge>
          {overCount > 0 ? <Badge tone="danger">เกินงบ {overCount} หมวด</Badge> : null}
        </div>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColorClass(status)}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </Card>
  );
}

interface BudgetItemRowProps {
  row: BudgetRow;
  onSet: () => void;
  onEdit: () => void;
}

function BudgetItemRow({ row, onSet, onEdit }: BudgetItemRowProps) {
  const hasBudget = row.budgetId !== null;
  const status = rowStatus(row);
  const barWidth = Math.min(row.percentage, 100);

  return (
    <li className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-4 shadow-lg transition hover:border-zinc-700">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xl">
            {row.categoryIcon}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-100">{row.categoryName}</p>
            {hasBudget ? (
              <p className={`text-xs font-semibold tabular-nums ${textColorClass(status)}`}>
                {row.percentage.toFixed(0)}%
                {status === 'overBudget' ? ' · เกินงบ' : ''}
              </p>
            ) : (
              <p className="text-xs text-zinc-500">ยังไม่ได้ตั้งงบ</p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {hasBudget ? (
            <>
              <div className="text-right">
                <p className="whitespace-nowrap text-sm font-semibold text-zinc-100 tabular-nums">
                  {formatCurrency(row.spentAmount)}
                </p>
                <p className="whitespace-nowrap text-xs text-zinc-500 tabular-nums">
                  / {formatCurrency(row.budgetAmount)}
                </p>
              </div>
              <IconButton tone="accent" label={`แก้ไขงบ ${row.categoryName}`} onClick={onEdit}>
                <PencilIcon className="h-4 w-4" />
              </IconButton>
            </>
          ) : (
            <Button size="sm" onClick={onSet} className="gap-1.5">
              <PlusIcon className="h-3.5 w-3.5" />
              ตั้งงบ
            </Button>
          )}
        </div>
      </div>

      {hasBudget ? (
        <div className="mt-3 space-y-1.5">
          <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColorClass(status)}`}
              style={{ width: `${barWidth}%` }}
            />
          </div>
        </div>
      ) : null}
    </li>
  );
}
