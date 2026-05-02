import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  type CategoryResponse,
  type CreateTransactionDto,
  type TransactionResponse,
} from '@finance-tracker/shared';
import { TransactionFormModal } from '../components/TransactionFormModal';
import { useToast } from '../components/ui/Toast';
import { apiFetch } from '../lib/api';
import { useAuth } from './AuthContext';

interface QuickAddContextValue {
  open: () => void;
  refreshVersion: number;
}

const QuickAddContext = createContext<QuickAddContextValue | null>(null);

export function QuickAddProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      setCategories([]);
      return;
    }
    let cancelled = false;
    apiFetch<CategoryResponse[]>('/api/categories')
      .then((result) => {
        if (!cancelled) setCategories(result);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, refreshVersion]);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleSubmit = useCallback(
    async (payload: CreateTransactionDto) => {
      await apiFetch<TransactionResponse>('/api/transactions', {
        method: 'POST',
        body: payload,
      });
      toast.success('เพิ่มรายการแล้ว');
      setIsOpen(false);
      setRefreshVersion((value) => value + 1);
    },
    [toast],
  );

  const value = useMemo<QuickAddContextValue>(
    () => ({ open, refreshVersion }),
    [open, refreshVersion],
  );

  return (
    <QuickAddContext.Provider value={value}>
      {children}
      <TransactionFormModal
        open={isOpen}
        initial={null}
        categories={categories}
        onClose={() => setIsOpen(false)}
        onSubmit={handleSubmit}
      />
    </QuickAddContext.Provider>
  );
}

export function useQuickAdd(): QuickAddContextValue {
  const ctx = useContext(QuickAddContext);
  if (!ctx) throw new Error('useQuickAdd must be used within QuickAddProvider');
  return ctx;
}
