import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import type {
  BudgetStatusItem,
  BudgetStatusResponse,
  CategoryResponse,
} from "@finance-tracker/shared";
import { TransactionType } from "@finance-tracker/shared";
import { BudgetFormModal } from "../components/budget/BudgetFormModal";
import { Button } from "../components/ui/Button";
import { FormAlert } from "../components/ui/FormAlert";
import { ApiError } from "../lib/api";
import { fetchBudgetStatus } from "../lib/budget-api";
import { fetchCategories } from "../lib/categories-api";
import { formatBaht, formatMonthYearThai } from "../lib/format";

interface BudgetRow {
  category: CategoryResponse;
  status: BudgetStatusItem | null;
}

interface FormModalState {
  isOpen: boolean;
  mode: "create" | "edit";
  category: CategoryResponse | null;
  currentAmount: number;
}

const CLOSED_MODAL: FormModalState = {
  isOpen: false,
  mode: "create",
  category: null,
  currentAmount: 0,
};

export default function Budget() {
  const now = useMemo(() => new Date(), []);
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [statuses, setStatuses] = useState<BudgetStatusResponse>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formModal, setFormModal] = useState<FormModalState>(CLOSED_MODAL);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [statusList, categoryList] = await Promise.all([
        fetchBudgetStatus(month, year),
        fetchCategories(),
      ]);
      setStatuses(statusList);
      setCategories(categoryList);
    } catch (err) {
      setError(extractMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const rows = useMemo<BudgetRow[]>(() => {
    const statusByName = new Map(statuses.map((s) => [s.categoryName, s]));
    return categories
      .filter((c) => c.type === TransactionType.EXPENSE)
      .map((category) => ({
        category,
        status: statusByName.get(category.name) ?? null,
      }))
      .sort((a, b) => {
        const aHas = hasBudget(a.status);
        const bHas = hasBudget(b.status);
        if (aHas !== bHas) return aHas ? -1 : 1;
        return a.category.name.localeCompare(b.category.name, "th");
      });
  }, [categories, statuses]);

  const budgetedCount = rows.filter((r) => hasBudget(r.status)).length;
  const totalBudget = rows.reduce(
    (sum, r) => sum + (r.status?.budgetAmount ?? 0),
    0,
  );
  const totalSpent = rows.reduce(
    (sum, r) => sum + (r.status?.spentAmount ?? 0),
    0,
  );

  function openCreateModal(category: CategoryResponse) {
    setFormModal({
      isOpen: true,
      mode: "create",
      category,
      currentAmount: 0,
    });
  }

  function openEditModal(category: CategoryResponse, currentAmount: number) {
    setFormModal({
      isOpen: true,
      mode: "edit",
      category,
      currentAmount,
    });
  }

  function closeFormModal() {
    setFormModal((prev) => ({ ...prev, isOpen: false }));
  }

  async function handleSaved() {
    closeFormModal();
    await loadData();
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="bg-gradient-to-r from-zinc-50 via-emerald-200 to-cyan-300 bg-clip-text font-heading text-2xl font-extrabold text-transparent">
            งบประมาณ
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            {formatMonthYearThai(year, month)} ·{" "}
            {rows.length === 0
              ? "ยังไม่มีหมวดรายจ่าย"
              : `ตั้งงบแล้ว ${budgetedCount}/${rows.length} หมวด`}
          </p>
        </div>
        {totalBudget > 0 ? (
          <div className="flex flex-col items-start rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-3 backdrop-blur-xl sm:items-end">
            <span className="text-xs text-zinc-400">รวมใช้ไป / งบรวม</span>
            <span className="font-heading text-base font-bold text-zinc-100">
              {formatBaht(totalSpent)}
              <span className="mx-1 text-zinc-500">/</span>
              <span className="text-emerald-300">{formatBaht(totalBudget)}</span>
            </span>
          </div>
        ) : null}
      </header>

      {error ? <FormAlert>{error}</FormAlert> : null}

      {isLoading && rows.length === 0 ? (
        <BudgetSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <BudgetRowCard
              key={row.category.id}
              row={row}
              onCreate={() => openCreateModal(row.category)}
              onEdit={() =>
                openEditModal(row.category, row.status?.budgetAmount ?? 0)
              }
            />
          ))}
        </ul>
      )}

      <BudgetFormModal
        isOpen={formModal.isOpen}
        mode={formModal.mode}
        category={formModal.category}
        currentAmount={formModal.currentAmount}
        month={month}
        year={year}
        onClose={closeFormModal}
        onSaved={handleSaved}
      />
    </section>
  );
}

interface BudgetRowCardProps {
  row: BudgetRow;
  onCreate: () => void;
  onEdit: () => void;
}

function BudgetRowCard({ row, onCreate, onEdit }: BudgetRowCardProps) {
  const { category, status } = row;
  const budgeted = hasBudget(status);

  if (!budgeted) {
    return (
      <li className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{category.icon}</span>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-zinc-100">
              {category.name}
            </span>
            <span className="text-xs text-zinc-500">ยังไม่ได้ตั้งงบ</span>
          </div>
        </div>
        <Button onClick={onCreate} className="sm:min-w-[140px]">
          <Plus size={16} />
          ตั้งงบ
        </Button>
      </li>
    );
  }

  const percentage = status!.percentage;
  const spent = status!.spentAmount;
  const budget = status!.budgetAmount;
  const { barClass, textClass } = resolveProgressColor(percentage);
  const clampedWidth = Math.min(percentage, 100);

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{category.icon}</span>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-zinc-100">
              {category.name}
            </span>
            <span className={`text-xs font-medium ${textClass}`}>
              {percentage.toFixed(0)}%
              {status!.isOverBudget ? " · เกินงบ" : ""}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onEdit}
          aria-label="แก้ไขงบ"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-400 transition duration-200 hover:bg-zinc-800 hover:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        >
          <Pencil size={16} />
        </button>
      </div>

      <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barClass}`}
          style={{ width: `${clampedWidth}%` }}
          role="progressbar"
          aria-valuenow={Math.round(percentage)}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span>
          ใช้ไป{" "}
          <span className="font-semibold text-zinc-100">
            {formatBaht(spent)}
          </span>
        </span>
        <span>
          งบ{" "}
          <span className="font-semibold text-zinc-100">
            {formatBaht(budget)}
          </span>
        </span>
      </div>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 px-6 py-10 text-center">
      <p className="text-sm text-zinc-400">
        ยังไม่มีหมวดรายจ่าย สร้างหมวดรายจ่ายก่อนเพื่อเริ่มตั้งงบประมาณ
      </p>
    </div>
  );
}

function BudgetSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div
          key={idx}
          className="h-24 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900"
        />
      ))}
    </div>
  );
}

function hasBudget(status: BudgetStatusItem | null): boolean {
  return status !== null && status.budgetAmount > 0;
}

function resolveProgressColor(percentage: number): {
  barClass: string;
  textClass: string;
} {
  if (percentage > 100) {
    return { barClass: "bg-rose-500", textClass: "text-rose-400" };
  }
  if (percentage >= 80) {
    return { barClass: "bg-orange-500", textClass: "text-orange-400" };
  }
  if (percentage >= 60) {
    return { barClass: "bg-yellow-500", textClass: "text-yellow-400" };
  }
  return { barClass: "bg-emerald-500", textClass: "text-emerald-400" };
}

function extractMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่";
}
