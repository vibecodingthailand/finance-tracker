import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import type { CategoryResponse } from "@finance-tracker/shared";
import { TransactionType } from "@finance-tracker/shared";
import { CategoryDeleteModal } from "../components/categories/CategoryDeleteModal";
import { CategoryFormModal } from "../components/categories/CategoryFormModal";
import { CategoryList } from "../components/categories/CategoryList";
import { Button } from "../components/ui/Button";
import { FormAlert } from "../components/ui/FormAlert";
import { ApiError } from "../lib/api";
import { fetchCategories } from "../lib/categories-api";

interface FormModalState {
  isOpen: boolean;
  mode: "create" | "edit";
  category: CategoryResponse | null;
}

export default function Categories() {
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formModal, setFormModal] = useState<FormModalState>({
    isOpen: false,
    mode: "create",
    category: null,
  });
  const [deleteTarget, setDeleteTarget] = useState<CategoryResponse | null>(
    null,
  );

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await fetchCategories();
      setCategories(list);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "โหลดหมวดไม่สำเร็จ",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  function openCreateModal() {
    setFormModal({ isOpen: true, mode: "create", category: null });
  }

  function openEditModal(category: CategoryResponse) {
    setFormModal({ isOpen: true, mode: "edit", category });
  }

  function closeFormModal() {
    setFormModal((prev) => ({ ...prev, isOpen: false }));
  }

  async function handleSaved() {
    closeFormModal();
    await loadCategories();
  }

  async function handleDeleted() {
    setDeleteTarget(null);
    await loadCategories();
  }

  const sorted = sortCategories(categories);
  const incomeCategories = sorted.filter(
    (c) => c.type === TransactionType.INCOME,
  );
  const expenseCategories = sorted.filter(
    (c) => c.type === TransactionType.EXPENSE,
  );

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="bg-gradient-to-r from-zinc-50 via-emerald-200 to-cyan-300 bg-clip-text font-heading text-2xl font-extrabold text-transparent">
            หมวดหมู่
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            จัดการหมวดรายรับและรายจ่ายของคุณ
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus size={18} />
          เพิ่มหมวดใหม่
        </Button>
      </header>

      {error ? <FormAlert>{error}</FormAlert> : null}

      {isLoading && categories.length === 0 ? (
        <CategoriesSkeleton />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <CategoryList
            title="รายรับ"
            accentClassName="text-emerald-400"
            categories={incomeCategories}
            onEdit={openEditModal}
            onDelete={setDeleteTarget}
            emptyLabel="ยังไม่มีหมวดรายรับ"
          />
          <CategoryList
            title="รายจ่าย"
            accentClassName="text-rose-400"
            categories={expenseCategories}
            onEdit={openEditModal}
            onDelete={setDeleteTarget}
            emptyLabel="ยังไม่มีหมวดรายจ่าย"
          />
        </div>
      )}

      <CategoryFormModal
        isOpen={formModal.isOpen}
        mode={formModal.mode}
        category={formModal.category}
        onClose={closeFormModal}
        onSaved={handleSaved}
      />

      <CategoryDeleteModal
        isOpen={deleteTarget !== null}
        category={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={handleDeleted}
      />
    </section>
  );
}

function sortCategories(list: CategoryResponse[]): CategoryResponse[] {
  return [...list].sort((a, b) => {
    const aDefault = a.userId === null ? 0 : 1;
    const bDefault = b.userId === null ? 0 : 1;
    if (aDefault !== bDefault) return aDefault - bDefault;
    return a.name.localeCompare(b.name, "th");
  });
}

function CategoriesSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {Array.from({ length: 2 }).map((_, col) => (
        <div key={col} className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, row) => (
            <div
              key={row}
              className="h-16 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
