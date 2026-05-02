import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  CategoryResponse,
  CreateTransactionDto,
  PaginatedTransactionResponse,
  TransactionResponse,
} from '@finance-tracker/shared';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';
import { PageHeader } from '../components/PageHeader';
import { Pagination } from '../components/Pagination';
import { SearchInput } from '../components/SearchInput';
import { TransactionFilters, type TransactionFiltersValue } from '../components/TransactionFilters';
import { TransactionFormModal } from '../components/TransactionFormModal';
import { TransactionsTable } from '../components/TransactionsTable';
import { PlusIcon } from '../components/icons';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useToast } from '../components/ui/Toast';
import { useQuickAdd } from '../contexts/QuickAddContext';
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
  const toast = useToast();
  const { refreshVersion } = useQuickAdd();
  const [filters, setFilters] = useState<TransactionFiltersValue>(INITIAL_FILTERS);
  const [search, setSearch] = useState('');
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
    if (search.trim() !== '') params.set('search', search.trim());
    return params.toString();
  }, [filters, page, search]);

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
  }, [queryString, refreshKey, refreshVersion]);

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
    setSearch('');
    setPage(1);
  }, []);

  const handleSearchChange = useCallback((next: string) => {
    setSearch(next);
    setPage(1);
  }, []);

  const handleSubmit = useCallback(
    async (payload: CreateTransactionDto, id: string | null) => {
      if (id) {
        await apiFetch<TransactionResponse>(`/api/transactions/${id}`, {
          method: 'PATCH',
          body: payload,
        });
        toast.success('บันทึกการแก้ไขแล้ว');
      } else {
        await apiFetch<TransactionResponse>('/api/transactions', {
          method: 'POST',
          body: payload,
        });
        toast.success('เพิ่มรายการแล้ว');
      }
      setModal('closed');
      setRefreshKey((value) => value + 1);
    },
    [toast],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await apiFetch<void>(`/api/transactions/${pendingDelete.id}`, { method: 'DELETE' });
      setPendingDelete(null);
      setRefreshKey((value) => value + 1);
      toast.success('ลบรายการแล้ว');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'ลบรายการไม่สำเร็จ';
      setError(message);
    } finally {
      setDeleting(false);
    }
  }, [pendingDelete, toast]);

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
      <PageHeader
        title="รายการ"
        subtitle="จัดการรายรับรายจ่ายทั้งหมดของคุณ"
        action={
          <Button onClick={() => setModal('create')} className="gap-2 sm:min-w-40">
            <PlusIcon className="h-4 w-4" />
            เพิ่มรายการ
          </Button>
        }
      />

      <SearchInput
        value={search}
        onChange={handleSearchChange}
        placeholder="ค้นหาตามรายละเอียด..."
      />

      <Card className="px-5 py-4">
        <TransactionFilters
          value={filters}
          categories={categories}
          onChange={handleFiltersChange}
          onReset={handleFiltersReset}
        />
      </Card>

      {error ? <ErrorState message={error} /> : null}

      {loading ? (
        <LoadingState variant="table" rows={6} />
      ) : isEmpty ? (
        <EmptyState
          title="ยังไม่มีรายการ"
          description="ลองล้างตัวกรองหรือเพิ่มรายการใหม่"
        >
          <Button onClick={() => setModal('create')} className="gap-2">
            <PlusIcon className="h-4 w-4" />
            เพิ่มรายการ
          </Button>
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
