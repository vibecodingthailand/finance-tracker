import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  TransactionType,
  type CategoryResponse,
} from '@finance-tracker/shared';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';
import { PageHeader } from '../components/PageHeader';
import { PencilIcon, PlusIcon, TrashIcon } from '../components/icons';
import {
  CategoryFormModal,
  type CategoryFormPayload,
} from '../components/CategoryFormModal';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { SegmentedControl, type SegmentedOption } from '../components/ui/SegmentedControl';
import { useToast } from '../components/ui/Toast';
import { ApiError, apiFetch } from '../lib/api';

type ModalState =
  | { kind: 'closed' }
  | { kind: 'create'; type: TransactionType }
  | { kind: 'edit'; category: CategoryResponse };

const tabOptions: SegmentedOption<TransactionType>[] = [
  { value: TransactionType.EXPENSE, label: 'รายจ่าย', tone: 'expense' },
  { value: TransactionType.INCOME, label: 'รายรับ', tone: 'income' },
];

export function Categories() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TransactionType>(TransactionType.EXPENSE);
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

  const filtered = useMemo(
    () => categories.filter((category) => category.type === activeTab),
    [categories, activeTab],
  );

  const counts = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const category of categories) {
      if (category.type === TransactionType.INCOME) income += 1;
      else expense += 1;
    }
    return { income, expense };
  }, [categories]);

  const handleSubmit = useCallback(
    async (payload: CategoryFormPayload, id: string | null) => {
      if (id) {
        await apiFetch<CategoryResponse>(`/api/categories/${id}`, {
          method: 'PATCH',
          body: { name: payload.name, icon: payload.icon },
        });
        toast.success('แก้ไขหมวดหมู่แล้ว');
      } else {
        await apiFetch<CategoryResponse>('/api/categories', {
          method: 'POST',
          body: payload,
        });
        toast.success('เพิ่มหมวดหมู่แล้ว');
      }
      setModal({ kind: 'closed' });
      setRefreshKey((value) => value + 1);
    },
    [toast],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await apiFetch<void>(`/api/categories/${pendingDelete.id}`, { method: 'DELETE' });
      setPendingDelete(null);
      setRefreshKey((value) => value + 1);
      toast.success('ลบหมวดหมู่แล้ว');
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
  }, [pendingDelete, toast]);

  const closeDeleteDialog = useCallback(() => {
    setPendingDelete(null);
    setDeleteError(null);
  }, []);

  const formInitial = modal.kind === 'edit' ? modal.category : null;
  const formDefaultType =
    modal.kind === 'create' ? modal.type : modal.kind === 'edit' ? modal.category.type : undefined;

  return (
    <div className="flex flex-col gap-6 animate-[fadeIn_300ms_ease-out]">
      <PageHeader
        title="หมวดหมู่"
        subtitle="จัดการหมวดหมู่ของรายรับและรายจ่าย หมวดเริ่มต้นแก้ไขไม่ได้"
        action={
          <Button
            onClick={() => setModal({ kind: 'create', type: activeTab })}
            className="gap-2 sm:min-w-40"
          >
            <PlusIcon className="h-4 w-4" />
            เพิ่มหมวดใหม่
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedControl
          value={activeTab}
          onChange={setActiveTab}
          options={tabOptions}
          fullWidth={false}
          ariaLabel="ประเภทหมวดหมู่"
        />
        <p className="text-xs text-zinc-500 sm:text-sm">
          รายจ่าย{' '}
          <span className="font-semibold text-zinc-200 tabular-nums">{counts.expense}</span>
          {' · '}
          รายรับ{' '}
          <span className="font-semibold text-zinc-200 tabular-nums">{counts.income}</span>
        </p>
      </div>

      {error ? <ErrorState message={error} /> : null}

      {loading ? (
        <LoadingState variant="grid" rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="ยังไม่มีหมวดหมู่"
          description="เริ่มต้นสร้างหมวดหมู่ใหม่ของคุณ"
        >
          <Button onClick={() => setModal({ kind: 'create', type: activeTab })} className="gap-2">
            <PlusIcon className="h-4 w-4" />
            เพิ่มหมวดใหม่
          </Button>
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              onEdit={(c) => setModal({ kind: 'edit', category: c })}
              onDelete={(c) => setPendingDelete(c)}
            />
          ))}
        </ul>
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

interface CategoryCardProps {
  category: CategoryResponse;
  onEdit: (category: CategoryResponse) => void;
  onDelete: (category: CategoryResponse) => void;
}

function CategoryCard({ category, onEdit, onDelete }: CategoryCardProps) {
  const isDefault = category.userId === null;
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 shadow-lg transition hover:border-zinc-700">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xl">
          {category.icon}
        </span>
        <p className="truncate text-sm font-medium text-zinc-100">{category.name}</p>
      </div>
      {isDefault ? (
        <Badge tone="neutral">เริ่มต้น</Badge>
      ) : (
        <div className="flex shrink-0 gap-1">
          <IconButton
            size="sm"
            tone="accent"
            label={`แก้ไข ${category.name}`}
            onClick={() => onEdit(category)}
          >
            <PencilIcon className="h-4 w-4" />
          </IconButton>
          <IconButton
            size="sm"
            tone="danger"
            label={`ลบ ${category.name}`}
            onClick={() => onDelete(category)}
          >
            <TrashIcon className="h-4 w-4" />
          </IconButton>
        </div>
      )}
    </li>
  );
}
