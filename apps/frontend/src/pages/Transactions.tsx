import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import type {
  CategoryResponse,
  PaginatedTransactions,
  TransactionResponse,
} from "@finance-tracker/shared";
import { TransactionType } from "@finance-tracker/shared";
import { DeleteConfirmModal } from "../components/transactions/DeleteConfirmModal";
import { Pagination } from "../components/transactions/Pagination";
import { TransactionFilters } from "../components/transactions/TransactionFilters";
import type { TransactionFilterState } from "../components/transactions/TransactionFilters";
import { TransactionFormModal } from "../components/transactions/TransactionFormModal";
import { TransactionTable } from "../components/transactions/TransactionTable";
import { Button } from "../components/ui/Button";
import { FormAlert } from "../components/ui/FormAlert";
import { ApiError } from "../lib/api";
import {
  fetchCategories,
  fetchTransactions,
} from "../lib/transactions-api";

const PAGE_SIZE = 20;

const DEFAULT_FILTERS: TransactionFilterState = {
  type: "ALL",
  categoryId: "",
  startDate: "",
  endDate: "",
};

interface FormModalState {
  isOpen: boolean;
  mode: "create" | "edit";
  transaction: TransactionResponse | null;
}

export default function Transactions() {
  const [filters, setFilters] = useState<TransactionFilterState>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [result, setResult] = useState<PaginatedTransactions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formModal, setFormModal] = useState<FormModalState>({
    isOpen: false,
    mode: "create",
    transaction: null,
  });
  const [deleteTarget, setDeleteTarget] = useState<TransactionResponse | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    fetchCategories()
      .then((list) => {
        if (!cancelled) setCategories(list);
      })
      .catch((err) => {
        if (!cancelled) setError(extractMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadTransactions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchTransactions({
        page,
        limit: PAGE_SIZE,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        categoryId: filters.categoryId || undefined,
        type: filters.type === "ALL" ? undefined : filters.type,
      });
      setResult(response);
    } catch (err) {
      setError(extractMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [
    page,
    filters.startDate,
    filters.endDate,
    filters.categoryId,
    filters.type,
  ]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  function handleFilterChange(next: TransactionFilterState) {
    setFilters(next);
    setPage(1);
  }

  function handleReset() {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }

  function openCreateModal() {
    setFormModal({ isOpen: true, mode: "create", transaction: null });
  }

  function openEditModal(tx: TransactionResponse) {
    setFormModal({ isOpen: true, mode: "edit", transaction: tx });
  }

  function closeFormModal() {
    setFormModal((prev) => ({ ...prev, isOpen: false }));
  }

  async function handleSaved() {
    closeFormModal();
    await loadTransactions();
  }

  async function handleDeleted() {
    setDeleteTarget(null);
    if (result && result.data.length === 1 && page > 1) {
      setPage((p) => p - 1);
      return;
    }
    await loadTransactions();
  }

  const total = result?.total ?? 0;
  const transactions = result?.data ?? [];

  const hasIncomeCategories = categories.some(
    (c) => c.type === TransactionType.INCOME,
  );
  const hasExpenseCategories = categories.some(
    (c) => c.type === TransactionType.EXPENSE,
  );
  const canCreate = hasIncomeCategories || hasExpenseCategories;

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="bg-gradient-to-r from-zinc-50 via-emerald-200 to-cyan-300 bg-clip-text font-heading text-2xl font-extrabold text-transparent">
            รายการ
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            {total > 0
              ? `ทั้งหมด ${total.toLocaleString("th-TH")} รายการ`
              : "ยังไม่มีรายการ"}
          </p>
        </div>
        <Button onClick={openCreateModal} disabled={!canCreate}>
          <Plus size={18} />
          เพิ่มรายการ
        </Button>
      </header>

      <TransactionFilters
        filters={filters}
        categories={categories}
        onChange={handleFilterChange}
        onReset={handleReset}
      />

      {error ? <FormAlert>{error}</FormAlert> : null}

      {isLoading && !result ? (
        <TransactionsSkeleton />
      ) : (
        <>
          <TransactionTable
            transactions={transactions}
            onEdit={openEditModal}
            onDelete={setDeleteTarget}
          />

          {total > 0 ? (
            <Pagination
              page={page}
              limit={PAGE_SIZE}
              total={total}
              onChange={setPage}
            />
          ) : null}
        </>
      )}

      <TransactionFormModal
        isOpen={formModal.isOpen}
        mode={formModal.mode}
        transaction={formModal.transaction}
        categories={categories}
        onClose={closeFormModal}
        onSaved={handleSaved}
      />

      <DeleteConfirmModal
        isOpen={deleteTarget !== null}
        transaction={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={handleDeleted}
      />
    </section>
  );
}

function TransactionsSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 6 }).map((_, idx) => (
        <div
          key={idx}
          className="h-16 animate-pulse rounded-lg border border-zinc-800 bg-zinc-900"
        />
      ))}
    </div>
  );
}

function extractMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่";
}
