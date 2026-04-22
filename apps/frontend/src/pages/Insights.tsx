import { useEffect, useState } from "react";
import { Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { TransactionType } from "@finance-tracker/shared";
import type {
  CategoryAnomaly,
  CategoryInsightBreakdown,
  MonthlyInsightData,
} from "@finance-tracker/shared";
import { MonthPicker } from "../components/dashboard/MonthPicker";
import { Card } from "../components/ui/Card";
import { FormAlert } from "../components/ui/FormAlert";
import { ApiError } from "../lib/api";
import { fetchMonthlyInsight } from "../lib/insight-api";
import { formatBaht, formatMonthYearThai } from "../lib/format";

function getCurrentPeriod(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export default function Insights() {
  const [period, setPeriod] = useState(getCurrentPeriod);
  const [insight, setInsight] = useState<MonthlyInsightData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    fetchMonthlyInsight(period)
      .then((result) => {
        if (!cancelled) setInsight(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setInsight(null);
          setError(extractMessage(err));
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period.month, period.year]);

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="bg-gradient-to-r from-zinc-50 via-emerald-200 to-cyan-300 bg-clip-text font-heading text-2xl font-extrabold text-transparent">
            ข้อมูลเชิงลึก
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            วิเคราะห์ประจำเดือน{" "}
            <span className="text-zinc-200">
              {formatMonthYearThai(period.year, period.month)}
            </span>
            {isLoading ? (
              <span className="ml-2 inline-flex items-center gap-1 text-emerald-300/80">
                <Sparkles size={14} className="animate-pulse" />
                กำลังวิเคราะห์ด้วย AI...
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

      {isLoading || !insight ? (
        error ? null : <InsightsSkeleton />
      ) : (
        <>
          <InsightSummaryCards
            totalIncome={insight.totalIncome}
            totalExpense={insight.totalExpense}
            balance={insight.balance}
            savingsRate={insight.savingsRate}
          />

          <AiSummaryCard summary={insight.summary} />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <CategoryBreakdownCard
              title="หมวดรายจ่าย"
              accentClassName="text-rose-300"
              barColorClassName="bg-rose-500/70"
              items={insight.byCategoryExpense}
            />
            <CategoryBreakdownCard
              title="หมวดรายรับ"
              accentClassName="text-emerald-300"
              barColorClassName="bg-emerald-500/70"
              items={insight.byCategoryIncome}
            />
          </div>

          {insight.anomalies.length > 0 ? (
            <AnomaliesCard anomalies={insight.anomalies} />
          ) : null}
        </>
      )}
    </section>
  );
}

interface InsightSummaryCardsProps {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  savingsRate: number;
}

function InsightSummaryCards({
  totalIncome,
  totalExpense,
  balance,
  savingsRate,
}: InsightSummaryCardsProps) {
  const savingsLabel = `${savingsRate.toFixed(1)}%`;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile
        label="รายรับ"
        value={formatBaht(totalIncome)}
        valueClassName="text-emerald-400"
        borderClassName="border-l-4 border-l-emerald-500"
      />
      <StatTile
        label="รายจ่าย"
        value={formatBaht(totalExpense)}
        valueClassName="text-rose-400"
        borderClassName="border-l-4 border-l-rose-500"
      />
      <StatTile
        label="คงเหลือ"
        value={formatBaht(balance)}
        valueClassName="text-sky-400"
        borderClassName="border-l-4 border-l-sky-500"
      />
      <StatTile
        label="อัตราการออม"
        value={savingsLabel}
        valueClassName="text-emerald-400"
        borderClassName="border-l-4 border-l-emerald-500"
      />
    </div>
  );
}

interface StatTileProps {
  label: string;
  value: string;
  valueClassName: string;
  borderClassName: string;
}

function StatTile({
  label,
  value,
  valueClassName,
  borderClassName,
}: StatTileProps) {
  return (
    <Card className={`p-5 ${borderClassName}`}>
      <p className="text-sm font-medium text-zinc-400">{label}</p>
      <p className={`mt-2 font-heading text-2xl font-bold ${valueClassName}`}>
        {value}
      </p>
    </Card>
  );
}

interface AiSummaryCardProps {
  summary: string;
}

function AiSummaryCard({ summary }: AiSummaryCardProps) {
  const hasSummary = summary.trim().length > 0;
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/70 p-5 shadow-lg backdrop-blur-xl sm:p-6">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 ring-1 ring-emerald-500/30">
          <Sparkles size={18} className="text-emerald-300" />
        </span>
        <h3 className="font-heading text-lg font-bold text-zinc-100">
          สรุปจาก AI
        </h3>
      </div>
      {hasSummary ? (
        <p className="whitespace-pre-line text-base leading-relaxed text-zinc-200">
          {summary}
        </p>
      ) : (
        <p className="text-sm text-zinc-500">ยังไม่มีบทสรุปสำหรับเดือนนี้</p>
      )}
    </div>
  );
}

interface CategoryBreakdownCardProps {
  title: string;
  accentClassName: string;
  barColorClassName: string;
  items: CategoryInsightBreakdown[];
}

function CategoryBreakdownCard({
  title,
  accentClassName,
  barColorClassName,
  items,
}: CategoryBreakdownCardProps) {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <h3 className={`font-heading text-lg font-bold ${accentClassName}`}>
        {title}
      </h3>
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/40 px-4 py-6 text-center text-sm text-zinc-500">
          ไม่มีข้อมูลในเดือนนี้
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <CategoryBreakdownRow
              key={item.categoryId}
              item={item}
              barColorClassName={barColorClassName}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}

interface CategoryBreakdownRowProps {
  item: CategoryInsightBreakdown;
  barColorClassName: string;
}

function CategoryBreakdownRow({
  item,
  barColorClassName,
}: CategoryBreakdownRowProps) {
  const pct = Math.max(0, Math.min(100, item.percentage));
  const widthClass = widthClassFromPercent(pct);
  return (
    <li className="flex flex-col gap-2 rounded-lg bg-zinc-800/60 p-3">
      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-xl"
          aria-hidden="true"
        >
          {item.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-100">
            {item.name}
          </p>
          <p className="text-xs text-zinc-500">{item.count} รายการ</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-heading text-sm font-bold text-zinc-100">
            {formatBaht(item.total)}
          </p>
          <p className="text-xs text-zinc-400">{pct.toFixed(1)}%</p>
        </div>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-900">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColorClassName} ${widthClass}`}
        />
      </div>
    </li>
  );
}

function widthClassFromPercent(pct: number): string {
  const buckets = [
    { t: 0, cls: "w-0" },
    { t: 5, cls: "w-[5%]" },
    { t: 10, cls: "w-[10%]" },
    { t: 20, cls: "w-[20%]" },
    { t: 30, cls: "w-[30%]" },
    { t: 40, cls: "w-[40%]" },
    { t: 50, cls: "w-[50%]" },
    { t: 60, cls: "w-[60%]" },
    { t: 70, cls: "w-[70%]" },
    { t: 80, cls: "w-[80%]" },
    { t: 90, cls: "w-[90%]" },
    { t: 100, cls: "w-full" },
  ];
  let selected = buckets[0].cls;
  for (const b of buckets) {
    if (pct >= b.t) selected = b.cls;
  }
  return selected;
}

interface AnomaliesCardProps {
  anomalies: CategoryAnomaly[];
}

function AnomaliesCard({ anomalies }: AnomaliesCardProps) {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <h3 className="font-heading text-lg font-bold text-zinc-100">
        ความเปลี่ยนแปลงที่น่าสนใจ
      </h3>
      <ul className="flex flex-col gap-2">
        {anomalies.map((a) => (
          <AnomalyRow key={a.categoryId} anomaly={a} />
        ))}
      </ul>
    </Card>
  );
}

interface AnomalyRowProps {
  anomaly: CategoryAnomaly;
}

function AnomalyRow({ anomaly }: AnomalyRowProps) {
  const isIncrease = anomaly.changePercentage > 0;
  const isExpense = anomaly.type === TransactionType.EXPENSE;
  const isPositiveSignal = isExpense ? !isIncrease : isIncrease;
  const toneClass = isPositiveSignal ? "text-emerald-400" : "text-rose-400";
  const toneBgClass = isPositiveSignal
    ? "bg-emerald-500/10 ring-emerald-500/30"
    : "bg-rose-500/10 ring-rose-500/30";
  const TrendIcon = isIncrease ? TrendingUp : TrendingDown;
  const sign = isIncrease ? "+" : "";

  return (
    <li className="flex flex-col gap-2 rounded-lg bg-zinc-800/60 p-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl ring-1 ${toneBgClass}`}
          aria-hidden="true"
        >
          {anomaly.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-100">
            {anomaly.name}
          </p>
          <p className="text-xs text-zinc-400">
            {formatBaht(anomaly.previousTotal)}
            <span className="mx-1 text-zinc-600">→</span>
            {formatBaht(anomaly.currentTotal)}
          </p>
        </div>
      </div>
      <div
        className={`inline-flex shrink-0 items-center gap-1 self-start rounded-md px-2 py-1 text-sm font-semibold sm:self-auto ${toneClass}`}
      >
        <TrendIcon size={16} />
        <span>
          {sign}
          {anomaly.changePercentage.toFixed(1)}%
        </span>
      </div>
    </li>
  );
}

function InsightsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="h-24 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900" />
        <div className="h-24 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900" />
        <div className="h-24 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900" />
        <div className="h-24 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900" />
      </div>
      <div className="h-40 animate-pulse rounded-xl border border-zinc-800/80 bg-zinc-900/70 backdrop-blur-xl" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="h-72 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900" />
        <div className="h-72 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900" />
      </div>
      <div className="h-48 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900" />
    </div>
  );
}

function extractMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่";
}
