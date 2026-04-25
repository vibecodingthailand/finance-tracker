import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  TransactionType,
  type CategoryResponse,
} from '@finance-tracker/shared';
import {
  CategoryFormModal,
  type CategoryFormPayload,
} from '../components/CategoryFormModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { PlusIcon } from '../components/icons';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ApiError, apiFetch } from '../lib/api';

type ModalState =
  | { kind: 'closed' }
  | { kind: 'create'; type: TransactionType }
  | { kind: 'edit'; category: CategoryResponse };

export function Categories() {
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modal, setModal] = useState<ModalState>({ kind: 'closed' });
  const [pendingDelete, setPendingDelete] = useState<CategoryResponse | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiFetch<CategoryResponse[]>('/api/categories')
      .then((result) => {
        if (cancelled) return;
        setCategories(result);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'โหลดหมวดหมู่ไม่สำเร็จ');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const incomeCategories = useMemo(
    () => categories.filter((category) => category.type === TransactionType.INCOME),
    [categories],
  );
  const expenseCategories = useMemo(
    () => categories.filter((category) => category.type === TransactionType.EXPENSE),
    [categories],
  );

  const handleSubmit = useCallback(
    async (payload: CategoryFormPayload, id: string | null) => {
      if (id) {
        await apiFetch<CategoryResponse>(`/api/categories/${id}`, {
          method: 'PATCH',
          body: { name: payload.name, icon: payload.icon },
        });
      } else {
        await apiFetch<CategoryResponse>('/api/categories', {
          method: 'POST',
          body: payload,
        });
      }
      setModal({ kind: 'closed' });
      setRefreshKey((value) => value + 1);
    },
    [],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await apiFetch<void>(`/api/categories/${pendingDelete.id}`, { method: 'DELETE' });
      setPendingDelete(null);
      setRefreshKey((value) => value + 1);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setDeleteError('มี transaction ใช้หมวดนี้อยู่ ย้าย transaction ไปหมวดอื่นก่อน');
      } else if (err instanceof ApiError) {
        setDeleteError(err.message);
      } else {
        setDeleteError('ลบหมวดหมู่ไม่สำเร็จ');
      }
    } finally {
      setDeleting(false);
    }
  }, [pendingDelete]);

  const closeDeleteDialog = useCallback(() => {
    setPendingDelete(null);
    setDeleteError(null);
  }, []);

  const formInitial = modal.kind === 'edit' ? modal.category : null;
  const formDefaultType =
    modal.kind === 'create' ? modal.type : modal.kind === 'edit' ? modal.category.type : undefined;

  return (
    <div className="flex flex-col gap-6 animate-[fadeIn_300ms_ease-out]">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-zinc-100 sm:text-3xl">หมวดหมู่</h1>
          <p className="text-sm text-zinc-400">
            จัดการหมวดหมู่ของรายรับและรายจ่าย หมวดเริ่มต้นแก้ไขไม่ได้
          </p>
        </div>
        <Button
          onClick={() => setModal({ kind: 'create', type: TransactionType.EXPENSE })}
          className="gap-2 sm:min-w-40"
        >
          <PlusIcon className="h-4 w-4" />
          เพิ่มหมวดใหม่
        </Button>
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
      ) : (
        <div className="flex flex-col gap-8">
          <CategorySection
            title="รายรับ"
            accentClass="text-emerald-400"
            categories={incomeCategories}
            onAdd={() => setModal({ kind: 'create', type: TransactionType.INCOME })}
            onEdit={(category) => setModal({ kind: 'edit', category })}
            onDelete={(category) => setPendingDelete(category)}
          />
          <CategorySection
            title="รายจ่าย"
            accentClass="text-rose-400"
            categories={expenseCategories}
            onAdd={() => setModal({ kind: 'create', type: TransactionType.EXPENSE })}
            onEdit={(category) => setModal({ kind: 'edit', category })}
            onDelete={(category) => setPendingDelete(category)}
          />
        </div>
      )}

      <CategoryFormModal
        open={modal.kind !== 'closed'}
        initial={formInitial}
        defaultType={formDefaultType}
        onClose={() => setModal({ kind: 'closed' })}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="ยืนยันการลบหมวดหมู่"
        description={
          pendingDelete
            ? `ต้องการลบหมวดหมู่ "${pendingDelete.name}" หรือไม่? การลบไม่สามารถย้อนกลับได้`
            : ''
        }
        confirmLabel="ลบหมวดหมู่"
        loading={deleting}
        error={deleteError}
        onConfirm={handleConfirmDelete}
        onClose={closeDeleteDialog}
      />
    </div>
  );
}

interface CategorySectionProps {
  title: string;
  accentClass: string;
  categories: CategoryResponse[];
  onAdd: () => void;
  onEdit: (category: CategoryResponse) => void;
  onDelete: (category: CategoryResponse) => void;
}

function CategorySection({
  title,
  accentClass,
  categories,
  onAdd,
  onEdit,
  onDelete,
}: CategorySectionProps) {
  return (
    <section>
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className={`font-heading text-xl font-semibold ${accentClass}`}>{title}</h2>
        <span className="text-xs text-zinc-500">{categories.length} หมวด</span>
      </header>
      {categories.length === 0 ? (
        <EmptyState title="ยังไม่มีหมวดหมู่" description="เพิ่มหมวดหมู่ใหม่เพื่อเริ่มต้น">
          <Button onClick={onAdd} className="gap-2">
            <PlusIcon className="h-4 w-4" />
            เพิ่มหมวดใหม่
          </Button>
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

interface CategoryCardProps {
  category: CategoryResponse;
  onEdit: (category: CategoryResponse) => void;
  onDelete: (category: CategoryResponse) => void;
}

function CategoryCard({ category, onEdit, onDelete }: CategoryCardProps) {
  const isDefault = category.userId === null;
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 shadow-lg">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xl">
          {category.icon}
        </span>
        <p className="truncate text-sm font-medium text-zinc-100">{category.name}</p>
      </div>
      {isDefault ? (
        <span className="shrink-0 rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-300">
          Default
        </span>
      ) : (
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            className="text-sm font-medium text-emerald-400 transition hover:text-emerald-300"
            onClick={() => onEdit(category)}
          >
            แก้ไข
          </button>
          <button
            type="button"
            className="text-sm font-medium text-rose-400 transition hover:text-rose-300"
            onClick={() => onDelete(category)}
          >
            ลบ
          </button>
        </div>
      )}
    </li>
  );
}
