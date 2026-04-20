import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import type {
  CategoryResponse,
  RecurringResponse,
} from "@finance-tracker/shared";
import { TransactionType } from "@finance-tracker/shared";
import { RecurringDeleteModal } from "../components/recurring/RecurringDeleteModal";
import { RecurringFormModal } from "../components/recurring/RecurringFormModal";
import { RecurringTable } from "../components/recurring/RecurringTable";
import { Button } from "../components/ui/Button";
import { FormAlert } from "../components/ui/FormAlert";
import { ApiError } from "../lib/api";
import { fetchCategories } from "../lib/categories-api";
import { fetchRecurrings, updateRecurring } from "../lib/recurring-api";

interface FormModalState {
  isOpen: boolean;
  mode: "create" | "edit";
  recurring: RecurringResponse | null;
}

export default function Recurring() {
  const [recurrings, setRecurrings] = useState<RecurringResponse[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [formModal, setFormModal] = useState<FormModalState>({
    isOpen: false,
    mode: "create",
    recurring: null,
  });
  const [deleteTarget, setDeleteTarget] = useState<RecurringResponse | null>(
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

  const loadRecurrings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await fetchRecurrings();
      setRecurrings(list);
    } catch (err) {
      setError(extractMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRecurrings();
  }, [loadRecurrings]);

  function openCreateModal() {
    setFormModal({ isOpen: true, mode: "create", recurring: null });
  }

  function openEditModal(r: RecurringResponse) {
    setFormModal({ isOpen: true, mode: "edit", recurring: r });
  }

  function closeFormModal() {
    setFormModal((prev) => ({ ...prev, isOpen: false }));
  }

  async function handleSaved() {
    closeFormModal();
    await loadRecurrings();
  }

  async function handleDeleted() {
    setDeleteTarget(null);
    await loadRecurrings();
  }

  async function handleToggleActive(r: RecurringResponse, next: boolean) {
    setError(null);
    setTogglingId(r.id);
    try {
      const updated = await updateRecurring(r.id, { active: next });
      setRecurrings((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (err) {
      setError(extractMessage(err));
    } finally {
      setTogglingId(null);
    }
  }

  const hasIncomeCategories = categories.some(
    (c) => c.type === TransactionType.INCOME,
  );
  const hasExpenseCategories = categories.some(
    (c) => c.type === TransactionType.EXPENSE,
  );
  const canCreate = hasIncomeCategories || hasExpenseCategories;

  const activeCount = recurrings.filter((r) => r.active).length;

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="bg-gradient-to-r from-zinc-50 via-emerald-200 to-cyan-300 bg-clip-text font-heading text-2xl font-extrabold text-transparent">
            รายการซ้ำ
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            {recurrings.length > 0
              ? `ทั้งหมด ${recurrings.length} รายการ · ใช้งาน ${activeCount} รายการ`
              : "ยังไม่มีรายการซ้ำ"}
          </p>
        </div>
        <Button onClick={openCreateModal} disabled={!canCreate}>
          <Plus size={18} />
          เพิ่มรายการซ้ำ
        </Button>
      </header>

      {error ? <FormAlert>{error}</FormAlert> : null}

      {isLoading && recurrings.length === 0 ? (
        <RecurringSkeleton />
      ) : (
        <RecurringTable
          recurrings={recurrings}
          togglingId={togglingId}
          onEdit={openEditModal}
          onDelete={setDeleteTarget}
          onToggleActive={handleToggleActive}
        />
      )}

      <RecurringFormModal
        isOpen={formModal.isOpen}
        mode={formModal.mode}
        recurring={formModal.recurring}
        categories={categories}
        onClose={closeFormModal}
        onSaved={handleSaved}
      />

      <RecurringDeleteModal
        isOpen={deleteTarget !== null}
        recurring={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={handleDeleted}
      />
    </section>
  );
}

function RecurringSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 4 }).map((_, idx) => (
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
