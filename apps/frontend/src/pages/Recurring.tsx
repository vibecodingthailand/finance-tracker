import { useCallback, useEffect, useState } from 'react';
import {
  TransactionType,
  type CategoryResponse,
  type CreateRecurringDto,
  type RecurringResponse,
  type UpdateRecurringDto,
} from '@finance-tracker/shared';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';
import { PageHeader } from '../components/PageHeader';
import { TypeToggle } from '../components/TypeToggle';
import { PencilIcon, PlusIcon, TrashIcon } from '../components/icons';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Select, type SelectOption } from '../components/ui/Select';
import { Switch } from '../components/ui/Switch';
import { useToast } from '../components/ui/Toast';
import { ApiError, apiFetch } from '../lib/api';
import { formatCurrency, formatNextRun } from '../lib/format';

type FormState = {
  amount: string;
  type: TransactionType;
  description: string;
  categoryId: string;
  dayOfMonth: string;
};

const emptyForm = (): FormState => ({
  amount: '',
  type: TransactionType.EXPENSE,
  description: '',
  categoryId: '',
  dayOfMonth: '1',
});

type ModalState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; recurring: RecurringResponse };

export function Recurring() {
  const toast = useToast();
  const [items, setItems] = useState<RecurringResponse[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ kind: 'closed' });
  const [pendingDelete, setPendingDelete] = useState<RecurringResponse | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      apiFetch<RecurringResponse[]>('/api/recurring'),
      apiFetch<CategoryResponse[]>('/api/categories'),
    ])
      .then(([recurring, cats]) => {
        if (cancelled) return;
        setItems(recurring);
        setCategories(cats);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'โหลดข้อมูลไม่สำเร็จ');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await apiFetch<void>(`/api/recurring/${pendingDelete.id}`, { method: 'DELETE' });
      setPendingDelete(null);
      setRefreshKey((k) => k + 1);
      toast.success('ลบรายการประจำแล้ว');
    } finally {
      setDeleting(false);
    }
  }, [pendingDelete, toast]);

  const handleToggleActive = useCallback(
    async (item: RecurringResponse) => {
      await apiFetch<RecurringResponse>(`/api/recurring/${item.id}`, {
        method: 'PATCH',
        body: { active: !item.active } as UpdateRecurringDto,
      });
      setRefreshKey((k) => k + 1);
      toast.info(item.active ? 'ปิดใช้งานรายการประจำแล้ว' : 'เปิดใช้งานรายการประจำแล้ว');
    },
    [toast],
  );

  return (
    <div className="flex flex-col gap-6 animate-[fadeIn_300ms_ease-out]">
      <PageHeader
        title="รายการประจำ"
        subtitle="ระบบจะสร้างรายการให้อัตโนมัติตามวันที่กำหนด"
        action={
          <Button onClick={() => setModal({ kind: 'create' })} className="gap-2 sm:min-w-40">
            <PlusIcon className="h-4 w-4" />
            เพิ่มรายการประจำ
          </Button>
        }
      />

      {error ? <ErrorState message={error} /> : null}

      {loading ? (
        <LoadingState variant="list" rows={4} />
      ) : items.length === 0 ? (
        <EmptyState title="ยังไม่มีรายการประจำ" description="เพิ่มรายการประจำเพื่อให้ระบบสร้างอัตโนมัติ">
          <Button onClick={() => setModal({ kind: 'create' })} className="gap-2">
            <PlusIcon className="h-4 w-4" />
            เพิ่มรายการประจำ
          </Button>
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {items.map((item) => (
            <RecurringCard
              key={item.id}
              item={item}
              onEdit={() => setModal({ kind: 'edit', recurring: item })}
              onDelete={() => setPendingDelete(item)}
              onToggleActive={() => handleToggleActive(item)}
            />
          ))}
        </ul>
      )}

      <RecurringFormModal
        open={modal.kind !== 'closed'}
        initial={modal.kind === 'edit' ? modal.recurring : null}
        categories={categories}
        onClose={() => setModal({ kind: 'closed' })}
        onSaved={() => {
          setModal({ kind: 'closed' });
          setRefreshKey((k) => k + 1);
        }}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="ยืนยันการลบ"
        description={
          pendingDelete
            ? `ต้องการลบ "${pendingDelete.description ?? 'รายการนี้'}" หรือไม่?`
            : ''
        }
        confirmLabel="ลบ"
        loading={deleting}
        error={null}
        onConfirm={handleConfirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}

interface RecurringCardProps {
  item: RecurringResponse;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}

function RecurringCard({ item, onEdit, onDelete, onToggleActive }: RecurringCardProps) {
  const isIncome = item.type === TransactionType.INCOME;
  const amountClass = isIncome ? 'text-emerald-400' : 'text-rose-400';
  const sign = isIncome ? '+' : '-';

  return (
    <li
      className={`flex flex-col gap-4 rounded-xl border bg-zinc-900 px-4 py-4 shadow-lg transition hover:border-zinc-700 ${
        item.active ? 'border-zinc-800' : 'border-zinc-800/60 opacity-75'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xl">
            {item.categoryIcon}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-100">
              {item.description?.trim() || item.categoryName}
            </p>
            <p className="truncate text-xs text-zinc-500">{item.categoryName}</p>
          </div>
        </div>
        <span className={`shrink-0 text-base font-semibold tabular-nums ${amountClass}`}>
          {sign}
          {formatCurrency(item.amount)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge tone={isIncome ? 'income' : 'expense'}>{isIncome ? 'รายรับ' : 'รายจ่าย'}</Badge>
        <Badge tone="neutral">วันที่ {item.dayOfMonth} ของเดือน</Badge>
        {item.active ? (
          <Badge tone="info">ครั้งถัดไป {formatNextRun(item.dayOfMonth)}</Badge>
        ) : (
          <Badge tone="neutral">ปิดใช้งาน</Badge>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-zinc-800 pt-3">
        <div className="flex items-center gap-2">
          <Switch
            checked={item.active}
            onChange={onToggleActive}
            label={item.active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
          />
          <span className="text-xs text-zinc-500">
            {item.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <IconButton size="sm" tone="accent" label="แก้ไข" onClick={onEdit}>
            <PencilIcon className="h-4 w-4" />
          </IconButton>
          <IconButton size="sm" tone="danger" label="ลบ" onClick={onDelete}>
            <TrashIcon className="h-4 w-4" />
          </IconButton>
        </div>
      </div>
    </li>
  );
}

interface RecurringFormModalProps {
  open: boolean;
  initial: RecurringResponse | null;
  categories: CategoryResponse[];
  onClose: () => void;
  onSaved: () => void;
}

function RecurringFormModal({
  open,
  initial,
  categories,
  onClose,
  onSaved,
}: RecurringFormModalProps) {
  const toast = useToast();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({
          amount: String(initial.amount),
          type: initial.type,
          description: initial.description ?? '',
          categoryId: initial.categoryId,
          dayOfMonth: String(initial.dayOfMonth),
        });
      } else {
        setForm(emptyForm());
      }
      setFormError(null);
    }
  }, [open, initial]);

  const filteredCategoryOptions: SelectOption[] = categories
    .filter((c) => c.type === form.type)
    .map((c) => ({ value: c.id, label: c.name, icon: c.icon }));

  const handleTypeChange = (type: TransactionType) => {
    setForm((f) => ({ ...f, type, categoryId: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const amount = parseFloat(form.amount);
    const dayOfMonth = parseInt(form.dayOfMonth, 10);

    if (isNaN(amount) || amount <= 0) {
      setFormError('กรุณากรอกจำนวนเงินที่ถูกต้อง');
      return;
    }
    if (!form.categoryId) {
      setFormError('กรุณาเลือกหมวดหมู่');
      return;
    }
    if (isNaN(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 28) {
      setFormError('วันที่ต้องอยู่ระหว่าง 1-28');
      return;
    }

    setSubmitting(true);
    try {
      if (initial) {
        const body: UpdateRecurringDto = {
          amount,
          type: form.type,
          description: form.description || undefined,
          categoryId: form.categoryId,
          dayOfMonth,
        };
        await apiFetch<RecurringResponse>(`/api/recurring/${initial.id}`, {
          method: 'PATCH',
          body,
        });
        toast.success('แก้ไขรายการประจำแล้ว');
      } else {
        const body: CreateRecurringDto = {
          amount,
          type: form.type,
          description: form.description || undefined,
          categoryId: form.categoryId,
          dayOfMonth,
        };
        await apiFetch<RecurringResponse>('/api/recurring', { method: 'POST', body });
        toast.success('เพิ่มรายการประจำแล้ว');
      }
      onSaved();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title={initial ? 'แก้ไขรายการประจำ' : 'เพิ่มรายการประจำ'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TypeToggle value={form.type} onChange={handleTypeChange} />

        <Input
          label="จำนวนเงิน (฿)"
          type="number"
          min="0.01"
          step="0.01"
          placeholder="0.00"
          value={form.amount}
          onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
        />

        <Input
          label="รายละเอียด (ไม่บังคับ)"
          type="text"
          placeholder="เช่น Netflix, ค่าเช่า"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />

        <Select
          label="หมวดหมู่"
          value={form.categoryId}
          options={filteredCategoryOptions}
          onChange={(value) => setForm((f) => ({ ...f, categoryId: value }))}
          placeholder="เลือกหมวดหมู่"
        />

        <Input
          label="วันที่ทำรายการ (1-28)"
          type="number"
          min="1"
          max="28"
          value={form.dayOfMonth}
          onChange={(e) => setForm((f) => ({ ...f, dayOfMonth: e.target.value }))}
        />

        {formError ? (
          <p className="text-sm text-rose-400">{formError}</p>
        ) : null}

        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button type="submit" loading={submitting}>
            {initial ? 'บันทึก' : 'เพิ่มรายการ'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
