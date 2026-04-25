import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  CategoryResponse,
  CreateTransactionDto,
  PaginatedTransactionResponse,
  TransactionResponse,
} from '@finance-tracker/shared';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { Pagination } from '../components/Pagination';
import { TransactionFilters, type TransactionFiltersValue } from '../components/TransactionFilters';
import { TransactionFormModal } from '../components/TransactionFormModal';
import { TransactionsTable } from '../components/TransactionsTable';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ApiError, apiFetch } from '../lib/api';

const PAGE_SIZE = 20;

const INITIAL_FILTERS: TransactionFiltersValue = {
  categoryId: '',
  type: '',
  startDate: '',
  endDate: '',
};

type ModalMode = 'closed' | 'create' | { kind: 'edit'; transaction: TransactionResponse };

export function Transactions() {
  const [filters, setFilters] = useState<TransactionFiltersValue>(INITIAL_FILTERS);
  const [page, setPage] = useState(1);

  const [data, setData] = useState<PaginatedTransactionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<CategoryResponse[]>([]);

  const [modal, setModal] = useState<ModalMode>('closed');
  const [pendingDelete, setPendingDelete] = useState<TransactionResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));
    if (filters.categoryId) params.set('categoryId', filters.categoryId);
    if (filters.type) params.set('type', filters.type);
    if (filters.startDate) params.set('startDate', `${filters.startDate}T00:00:00.000Z`);
    if (filters.endDate) params.set('endDate', `${filters.endDate}T23:59:59.999Z`);
    return params.toString();
  }, [filters, page]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiFetch<PaginatedTransactionResponse>(`/api/transactions?${queryString}`)
      .then((result) => {
        if (cancelled) return;
        setData(result);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'โหลดรายการไม่สำเร็จ');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [queryString, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    apiFetch<CategoryResponse[]>('/api/categories')
      .then((result) => {
        if (!cancelled) setCategories(result);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFiltersChange = useCallback((next: TransactionFiltersValue) => {
    setFilters(next);
    setPage(1);
  }, []);

  const handleFiltersReset = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    setPage(1);
  }, []);

  const handleSubmit = useCallback(
    async (payload: CreateTransactionDto, id: string | null) => {
      if (id) {
        await apiFetch<TransactionResponse>(`/api/transactions/${id}`, {
          method: 'PATCH',
          body: payload,
        });
      } else {
        await apiFetch<TransactionResponse>('/api/transactions', {
          method: 'POST',
          body: payload,
        });
      }
      setModal('closed');
      setRefreshKey((value) => value + 1);
    },
    [],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await apiFetch<void>(`/api/transactions/${pendingDelete.id}`, { method: 'DELETE' });
      setPendingDelete(null);
      setRefreshKey((value) => value + 1);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'ลบรายการไม่สำเร็จ';
      setError(message);
    } finally {
      setDeleting(false);
    }
  }, [pendingDelete]);

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const totalPages = data ? Math.max(Math.ceil(data.total / data.limit), 1) : 1;
  const transactions = data?.data ?? [];
  const isEmpty = !loading && transactions.length === 0;
  const formInitial = typeof modal === 'object' ? modal.transaction : null;

  return (
    <div className="flex flex-col gap-6 animate-[fadeIn_300ms_ease-out]">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-zinc-100 sm:text-3xl">รายการ</h1>
          <p className="text-sm text-zinc-400">จัดการรายรับรายจ่ายทั้งหมดของคุณ</p>
        </div>
        <Button onClick={() => setModal('create')} className="sm:min-w-40">
          เพิ่มรายการ
        </Button>
      </header>

      <Card className="px-5 py-4">
        <TransactionFilters
          value={filters}
          categories={categories}
          onChange={handleFiltersChange}
          onReset={handleFiltersReset}
        />
      </Card>

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
      ) : isEmpty ? (
        <EmptyState
          title="ยังไม่มีรายการ"
          description="ลองล้างตัวกรองหรือเพิ่มรายการใหม่"
        >
          <Button onClick={() => setModal('create')}>เพิ่มรายการ</Button>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          <TransactionsTable
            transactions={transactions}
            categories={categoryMap}
            onEdit={(transaction) => setModal({ kind: 'edit', transaction })}
            onDelete={(transaction) => setPendingDelete(transaction)}
          />
          <Pagination
            page={page}
            totalPages={totalPages}
            total={data?.total ?? 0}
            onChange={setPage}
          />
        </div>
      )}

      <TransactionFormModal
        open={modal !== 'closed'}
        initial={formInitial}
        categories={categories}
        onClose={() => setModal('closed')}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="ยืนยันการลบรายการ"
        description={
          pendingDelete
            ? `ต้องการลบรายการ "${pendingDelete.description?.trim() || 'ไม่ระบุ'}" หรือไม่? การลบไม่สามารถย้อนกลับได้`
            : ''
        }
        confirmLabel="ลบรายการ"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}
