import { useCallback, useEffect, useState } from 'react';
import type {
  CategoryResponse,
  PaginatedTransactionResponse,
  SummaryResponse,
} from '@finance-tracker/shared';
import { BalanceHero } from '../components/BalanceHero';
import { CategoryPieChart } from '../components/CategoryPieChart';
import { DailyBarChart } from '../components/DailyBarChart';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';
import { MonthPicker } from '../components/MonthPicker';
import { PageHeader } from '../components/PageHeader';
import { RecentTransactionsCard } from '../components/RecentTransactionsCard';
import { TopCategoriesCard } from '../components/TopCategoriesCard';
import { Skeleton } from '../components/ui/Skeleton';
import { useQuickAdd } from '../contexts/QuickAddContext';
import { ApiError, apiFetch } from '../lib/api';
import { THAI_MONTH_NAMES } from '../lib/format';

const TRANSACTION_LIMIT = 10;

const now = new Date();

function previousMonth(month: number, year: number): { month: number; year: number } {
  if (month === 1) return { month: 12, year: year - 1 };
  return { month: month - 1, year };
}

export function Dashboard() {
  const { refreshVersion } = useQuickAdd();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [prevSummary, setPrevSummary] = useState<SummaryResponse | null>(null);
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
    setPrevSummary(null);
    const prev = previousMonth(month, year);
    Promise.all([
      apiFetch<SummaryResponse>(`/api/transactions/summary?month=${month}&year=${year}`),
      apiFetch<SummaryResponse>(`/api/transactions/summary?month=${prev.month}&year=${prev.year}`).catch(
        () => null,
      ),
    ])
      .then(([current, previous]) => {
        if (cancelled) return;
        setSummary(current);
        setPrevSummary(previous);
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
  }, [month, year, refreshVersion]);

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
  }, [refreshVersion]);

  return (
    <div className="flex flex-col gap-6 animate-[fadeIn_300ms_ease-out]">
      <PageHeader
        title="ภาพรวม"
        subtitle={`สรุปประจำเดือน ${THAI_MONTH_NAMES[month - 1]} ${year}`}
        action={<MonthPicker month={month} year={year} onChange={handleMonthChange} />}
      />

      <HeroSection
        summary={summary}
        prevSummary={prevSummary}
        loading={summaryLoading}
        error={summaryError}
        month={month}
        year={year}
      />

      <ChartsSection
        summary={summary}
        loading={summaryLoading}
        error={summaryError}
      />

      <RecentSection
        transactions={transactions?.data ?? []}
        categories={categories}
        loading={sideLoading}
        error={sideError}
      />
    </div>
  );
}

interface HeroSectionProps {
  summary: SummaryResponse | null;
  prevSummary: SummaryResponse | null;
  loading: boolean;
  error: string | null;
  month: number;
  year: number;
}

function HeroSection({ summary, prevSummary, loading, error, month, year }: HeroSectionProps) {
  if (loading || !summary) {
    return <Skeleton className="h-44 sm:h-48" />;
  }
  if (error) {
    return <ErrorState message={error} />;
  }
  return <BalanceHero summary={summary} prevSummary={prevSummary} month={month} year={year} />;
}

interface ChartsSectionProps {
  summary: SummaryResponse | null;
  loading: boolean;
  error: string | null;
}

function ChartsSection({ summary, loading, error }: ChartsSectionProps) {
  if (loading || !summary) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    );
  }
  if (error) {
    return null;
  }
  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TopCategoriesCard data={summary.byCategoryExpense} />
        <DailyBarChart data={summary.dailyTotals} />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <CategoryPieChart title="รายจ่ายแยกหมวดหมู่" data={summary.byCategoryExpense} palette="expense" />
        <CategoryPieChart title="รายรับแยกหมวดหมู่" data={summary.byCategoryIncome} palette="income" />
      </div>
    </>
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
