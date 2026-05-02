import { useCallback, useEffect, useState } from 'react';
import type {
  CategoryResponse,
  PaginatedTransactionResponse,
  SummaryResponse,
} from '@finance-tracker/shared';
import { CategoryPieChart } from '../components/CategoryPieChart';
import { DailyBarChart } from '../components/DailyBarChart';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';
import { MonthPicker } from '../components/MonthPicker';
import { PageHeader } from '../components/PageHeader';
import { RecentTransactionsCard } from '../components/RecentTransactionsCard';
import { SummaryCard } from '../components/SummaryCard';
import { TrendingDownIcon, TrendingUpIcon, WalletIcon } from '../components/icons';
import { Skeleton } from '../components/ui/Skeleton';
import { ApiError, apiFetch } from '../lib/api';
import { THAI_MONTH_NAMES } from '../lib/format';

const TRANSACTION_LIMIT = 10;

const now = new Date();

export function Dashboard() {
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [transactions, setTransactions] = useState<PaginatedTransactionResponse | null>(null);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [sideLoading, setSideLoading] = useState(true);
  const [sideError, setSideError] = useState<string | null>(null);

  const handleMonthChange = useCallback((nextMonth: number, nextYear: number) => {
    setMonth(nextMonth);
    setYear(nextYear);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSummaryLoading(true);
    setSummaryError(null);
    apiFetch<SummaryResponse>(`/api/transactions/summary?month=${month}&year=${year}`)
      .then((result) => {
        if (cancelled) return;
        setSummary(result);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setSummaryError(error instanceof ApiError ? error.message : 'โหลดสรุปข้อมูลไม่สำเร็จ');
      })
      .finally(() => {
        if (!cancelled) setSummaryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [month, year]);

  useEffect(() => {
    let cancelled = false;
    setSideLoading(true);
    setSideError(null);
    Promise.all([
      apiFetch<PaginatedTransactionResponse>(`/api/transactions?limit=${TRANSACTION_LIMIT}`),
      apiFetch<CategoryResponse[]>('/api/categories'),
    ])
      .then(([transactionsResult, categoriesResult]) => {
        if (cancelled) return;
        setTransactions(transactionsResult);
        setCategories(categoriesResult);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setSideError(error instanceof ApiError ? error.message : 'โหลดข้อมูลไม่สำเร็จ');
      })
      .finally(() => {
        if (!cancelled) setSideLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-6 animate-[fadeIn_300ms_ease-out]">
      <PageHeader
        title="ภาพรวม"
        subtitle={`สรุปประจำเดือน ${THAI_MONTH_NAMES[month - 1]} ${year}`}
        action={<MonthPicker month={month} year={year} onChange={handleMonthChange} />}
      />

      <SummarySection summary={summary} loading={summaryLoading} error={summaryError} />

      <ChartsSection summary={summary} loading={summaryLoading} error={summaryError} />

      <RecentSection
        transactions={transactions?.data ?? []}
        categories={categories}
        loading={sideLoading}
        error={sideError}
      />
    </div>
  );
}

interface SummarySectionProps {
  summary: SummaryResponse | null;
  loading: boolean;
  error: string | null;
}

function SummarySection({ summary, loading, error }: SummarySectionProps) {
  if (loading || !summary) {
    return <LoadingState variant="cards" />;
  }
  if (error) {
    return <ErrorState message={error} />;
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <SummaryCard
        label="รายรับรวม"
        amount={summary.totalIncome}
        tone="income"
        icon={<TrendingUpIcon className="h-6 w-6" />}
      />
      <SummaryCard
        label="รายจ่ายรวม"
        amount={summary.totalExpense}
        tone="expense"
        icon={<TrendingDownIcon className="h-6 w-6" />}
      />
      <SummaryCard
        label="คงเหลือ"
        amount={summary.balance}
        tone="balance"
        icon={<WalletIcon className="h-6 w-6" />}
      />
    </div>
  );
}

interface ChartsSectionProps {
  summary: SummaryResponse | null;
  loading: boolean;
  error: string | null;
}

function ChartsSection({ summary, loading, error }: ChartsSectionProps) {
  if (loading || !summary) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
        <Skeleton className="h-80 md:col-span-2 lg:col-span-1" />
      </div>
    );
  }
  if (error) {
    return null;
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <CategoryPieChart title="รายจ่ายแยกหมวดหมู่" data={summary.byCategoryExpense} palette="expense" />
      <CategoryPieChart title="รายรับแยกหมวดหมู่" data={summary.byCategoryIncome} palette="income" />
      <DailyBarChart data={summary.dailyTotals} className="md:col-span-2 lg:col-span-1" />
    </div>
  );
}

interface RecentSectionProps {
  transactions: ReturnType<() => PaginatedTransactionResponse['data']>;
  categories: CategoryResponse[];
  loading: boolean;
  error: string | null;
}

function RecentSection({ transactions, categories, loading, error }: RecentSectionProps) {
  if (loading) {
    return <Skeleton className="h-64" />;
  }
  if (error) {
    return <ErrorState message={error} />;
  }
  return <RecentTransactionsCard transactions={transactions} categories={categories} />;
}
