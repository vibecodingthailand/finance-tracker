import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BudgetStatusItem, BudgetStatusResponse, CategoryResponse } from '@finance-tracker/shared';
import { TransactionType } from '@finance-tracker/shared';
import { BudgetFormModal } from '../components/BudgetFormModal';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';
import { PageHeader } from '../components/PageHeader';
import { PencilIcon, PlusIcon } from '../components/icons';
import { Button } from '../components/ui/Button';
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

function barColorClass(percentage: number, isOverBudget: boolean): string {
  if (isOverBudget || percentage > 100) return 'bg-rose-500';
  if (percentage >= 80) return 'bg-orange-400';
  if (percentage >= 60) return 'bg-yellow-400';
  return 'bg-emerald-500';
}

function textColorClass(percentage: number, isOverBudget: boolean): string {
  if (isOverBudget || percentage > 100) return 'text-rose-400';
  if (percentage >= 80) return 'text-orange-400';
  if (percentage >= 60) return 'text-yellow-400';
  return 'text-emerald-400';
}

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
      <PageHeader
        title="งบประมาณ"
        subtitle={`${THAI_MONTH_NAMES[month - 1]} ${year}`}
      />

      {error ? <ErrorState message={error} /> : null}

      {loading ? (
        <LoadingState variant="list" rows={4} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="ยังไม่มีหมวดหมู่รายจ่าย"
          description="เพิ่มหมวดหมู่รายจ่ายก่อนเพื่อตั้งงบประมาณ"
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <BudgetItemRow
              key={row.categoryId}
              row={row}
              onSet={() =>
                setModal({ kind: 'set', categoryId: row.categoryId, categoryName: row.categoryName })
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

interface BudgetItemRowProps {
  row: BudgetRow;
  onSet: () => void;
  onEdit: () => void;
}

function BudgetItemRow({ row, onSet, onEdit }: BudgetItemRowProps) {
  const hasBudget = row.budgetId !== null;
  const barWidth = Math.min(row.percentage, 100);

  return (
    <li className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-4 shadow-lg">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xl">
            {row.categoryIcon}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-100">{row.categoryName}</p>
            {hasBudget ? (
              <p className={`text-xs font-semibold ${textColorClass(row.percentage, row.isOverBudget)}`}>
                {row.percentage.toFixed(0)}%{row.isOverBudget ? ' · เกินงบ!' : ''}
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
                <p className="whitespace-nowrap text-sm font-semibold text-zinc-100">
                  {formatCurrency(row.spentAmount)}
                </p>
                <p className="whitespace-nowrap text-xs text-zinc-500">
                  / {formatCurrency(row.budgetAmount)}
                </p>
              </div>
              <IconButton tone="accent" label={`แก้ไขงบ ${row.categoryName}`} onClick={onEdit}>
                <PencilIcon className="h-4 w-4" />
              </IconButton>
            </>
          ) : (
            <Button onClick={onSet} className="gap-1.5 px-3 text-xs">
              <PlusIcon className="h-3.5 w-3.5" />
              ตั้งงบ
            </Button>
          )}
        </div>
      </div>

      {hasBudget ? (
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColorClass(row.percentage, row.isOverBudget)}`}
              style={{ width: `${barWidth}%` }}
            />
          </div>
        </div>
      ) : null}
    </li>
  );
}
