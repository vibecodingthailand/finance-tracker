import { useEffect, useState } from "react";
import type {
  CategoryResponse,
  SummaryResponse,
  TransactionResponse,
} from "@finance-tracker/shared";
import { CategoryPieChart } from "../components/dashboard/CategoryPieChart";
import { DailyBarChart } from "../components/dashboard/DailyBarChart";
import { MonthPicker } from "../components/dashboard/MonthPicker";
import { RecentTransactions } from "../components/dashboard/RecentTransactions";
import { SummaryCards } from "../components/dashboard/SummaryCards";
import { FormAlert } from "../components/ui/FormAlert";
import { ApiError } from "../lib/api";
import {
  fetchCategories,
  fetchSummary,
  fetchTransactions,
} from "../lib/transactions-api";
import { formatMonthYearThai } from "../lib/format";

const EXPENSE_PALETTE = [
  "#f43f5e",
  "#fb7185",
  "#f97316",
  "#fb923c",
  "#f59e0b",
  "#eab308",
  "#dc2626",
  "#9f1239",
];

const INCOME_PALETTE = [
  "#10b981",
  "#34d399",
  "#06b6d4",
  "#22d3ee",
  "#14b8a6",
  "#2dd4bf",
  "#0ea5e9",
  "#38bdf8",
];

const DEFAULT_LIMIT = 10;

function getCurrentPeriod(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export default function Dashboard() {
  const [period, setPeriod] = useState(getCurrentPeriod);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [categoriesCount, setCategoriesCount] = useState<number | null>(null);

  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [isStaticLoading, setIsStaticLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsStaticLoading(true);
    Promise.all([
      fetchTransactions({ limit: DEFAULT_LIMIT }),
      fetchCategories(),
    ])
      .then(([txList, categories]: [
        { data: TransactionResponse[] },
        CategoryResponse[],
      ]) => {
        if (cancelled) return;
        setTransactions(txList.data);
        setCategoriesCount(categories.length);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(extractMessage(err));
      })
      .finally(() => {
        if (!cancelled) setIsStaticLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsSummaryLoading(true);
    fetchSummary(period)
      .then((result) => {
        if (!cancelled) setSummary(result);
      })
      .catch((err) => {
        if (!cancelled) setError(extractMessage(err));
      })
      .finally(() => {
        if (!cancelled) setIsSummaryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period.month, period.year]);

  const isInitialLoading =
    (isSummaryLoading && !summary) || (isStaticLoading && transactions.length === 0);

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-extrabold text-zinc-100">
            แดชบอร์ด
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            สรุปประจำเดือน{" "}
            <span className="text-zinc-200">
              {formatMonthYearThai(period.year, period.month)}
            </span>
            {categoriesCount !== null ? (
              <span className="ml-2 text-zinc-500">
                · {categoriesCount} หมวด
              </span>
            ) : null}
          </p>
        </div>
        <MonthPicker
          month={period.month}
          year={period.year}
          onChange={setPeriod}
        />
      </header>

      {error ? <FormAlert>{error}</FormAlert> : null}

      {isInitialLoading ? (
        <DashboardSkeleton />
      ) : summary ? (
        <>
          <SummaryCards
            totalIncome={summary.totalIncome}
            totalExpense={summary.totalExpense}
            balance={summary.balance}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <CategoryPieChart
              title="รายจ่ายแยกหมวด"
              data={summary.byCategoryExpense}
              palette={EXPENSE_PALETTE}
            />
            <CategoryPieChart
              title="รายรับแยกหมวด"
              data={summary.byCategoryIncome}
              palette={INCOME_PALETTE}
            />
            <div className="md:col-span-2 xl:col-span-1">
              <DailyBarChart data={summary.dailyTotals} />
            </div>
          </div>

          <RecentTransactions transactions={transactions} />
        </>
      ) : null}
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="h-24 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900" />
        <div className="h-24 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900" />
        <div className="h-24 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="h-80 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900" />
        <div className="h-80 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900" />
        <div className="h-80 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900 md:col-span-2 xl:col-span-1" />
      </div>
      <div className="h-64 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900" />
    </div>
  );
}

function extractMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่";
}
