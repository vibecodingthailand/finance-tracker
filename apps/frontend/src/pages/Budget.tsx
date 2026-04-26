import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BudgetStatusItem, BudgetStatusResponse, CategoryResponse } from '@finance-tracker/shared';
import { TransactionType } from '@finance-tracker/shared';
import { BudgetFormModal } from '../components/BudgetFormModal';
import { PencilIcon, PlusIcon } from '../components/icons';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
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
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold text-zinc-100 sm:text-3xl">งบประมาณ</h1>
        <p className="text-sm text-zinc-400">
          {THAI_MONTH_NAMES[month - 1]} {year}
        </p>
      </header>

      {error ? (
        <Card className="px-5 py-4 text-sm text-rose-300">
          <p className="font-medium">{error}</p>
          <p className="mt-1 text-xs text-rose-300/70">กรุณาลองใหม่อีกครั้ง</p>
        </Card>
      ) : null}

      {loading ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-5 py-12 text-center text-sm text-zinc-500">
          กำลังโหลด...
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 px-4 py-10 text-center">
          <p className="font-heading text-base font-semibold text-zinc-200">ยังไม่มีหมวดหมู่รายจ่าย</p>
          <p className="mt-1 text-sm text-zinc-500">เพิ่มหมวดหมู่รายจ่ายก่อนเพื่อตั้งงบประมาณ</p>
        </div>
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
              <button
                type="button"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-800 hover:text-emerald-400"
                onClick={onEdit}
                aria-label={`แก้ไขงบ ${row.categoryName}`}
              >
                <PencilIcon className="h-4 w-4" />
              </button>
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
