import { BadRequestException, Injectable } from "@nestjs/common";
import {
  CategoryAnomaly,
  CategoryInsightBreakdown,
  MonthlyInsightData,
  TransactionType,
} from "@finance-tracker/shared";
import type { Prisma } from "@finance-tracker/database";
import {
  TransactionWithCategory,
  TransactionsRepository,
} from "../transactions/transactions.repository";

const ANOMALY_THRESHOLD_PERCENTAGE = 30;

interface CategoryBucket {
  categoryId: string;
  name: string;
  icon: string;
  type: TransactionType;
  total: number;
  count: number;
}

interface MonthAggregate {
  totalIncome: number;
  totalExpense: number;
  incomeBuckets: Map<string, CategoryBucket>;
  expenseBuckets: Map<string, CategoryBucket>;
}

@Injectable()
export class InsightService {
  constructor(private readonly transactions: TransactionsRepository) {}

  async getMonthlyData(
    userId: string,
    month: number,
    year: number,
  ): Promise<MonthlyInsightData> {
    this.validatePeriod(month, year);

    const current = monthRange(year, month);
    const previous = previousMonthRange(year, month);

    const [currentRows, previousRows] = await Promise.all([
      this.transactions.findInRange(userId, current.start, current.end),
      this.transactions.findInRange(userId, previous.start, previous.end),
    ]);

    const currentAgg = aggregate(currentRows);
    const previousAgg = aggregate(previousRows);

    const totalIncome = round2(currentAgg.totalIncome);
    const totalExpense = round2(currentAgg.totalExpense);
    const balance = round2(currentAgg.totalIncome - currentAgg.totalExpense);
    const savingsRate =
      currentAgg.totalIncome > 0
        ? round2(
            ((currentAgg.totalIncome - currentAgg.totalExpense) /
              currentAgg.totalIncome) *
              100,
          )
        : 0;

    return {
      month,
      year,
      totalIncome,
      totalExpense,
      balance,
      savingsRate,
      byCategoryIncome: toBreakdowns(
        currentAgg.incomeBuckets,
        currentAgg.totalIncome,
      ),
      byCategoryExpense: toBreakdowns(
        currentAgg.expenseBuckets,
        currentAgg.totalExpense,
      ),
      anomalies: detectAnomalies(currentAgg, previousAgg),
    };
  }

  private validatePeriod(month: number, year: number): void {
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new BadRequestException("เดือนต้องอยู่ระหว่าง 1-12");
    }
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new BadRequestException("ปีต้องอยู่ระหว่าง 2000-2100");
    }
  }
}

function monthRange(year: number, month: number): { start: Date; end: Date } {
  return {
    start: new Date(year, month - 1, 1, 0, 0, 0, 0),
    end: new Date(year, month, 1, 0, 0, 0, 0),
  };
}

function previousMonthRange(
  year: number,
  month: number,
): { start: Date; end: Date } {
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  return monthRange(prevYear, prevMonth);
}

function aggregate(rows: TransactionWithCategory[]): MonthAggregate {
  const agg: MonthAggregate = {
    totalIncome: 0,
    totalExpense: 0,
    incomeBuckets: new Map(),
    expenseBuckets: new Map(),
  };

  for (const tx of rows) {
    const amount = amountToNumber(tx.amount);
    if (tx.type === TransactionType.INCOME) {
      agg.totalIncome += amount;
      accumulate(agg.incomeBuckets, tx, amount, TransactionType.INCOME);
    } else {
      agg.totalExpense += amount;
      accumulate(agg.expenseBuckets, tx, amount, TransactionType.EXPENSE);
    }
  }

  return agg;
}

function accumulate(
  map: Map<string, CategoryBucket>,
  tx: TransactionWithCategory,
  amount: number,
  type: TransactionType,
): void {
  const existing = map.get(tx.categoryId);
  if (existing) {
    existing.total += amount;
    existing.count += 1;
    return;
  }
  map.set(tx.categoryId, {
    categoryId: tx.categoryId,
    name: tx.category.name,
    icon: tx.category.icon,
    type,
    total: amount,
    count: 1,
  });
}

function toBreakdowns(
  buckets: Map<string, CategoryBucket>,
  grandTotal: number,
): CategoryInsightBreakdown[] {
  return [...buckets.values()]
    .map((b) => ({
      categoryId: b.categoryId,
      name: b.name,
      icon: b.icon,
      total: round2(b.total),
      count: b.count,
      percentage:
        grandTotal > 0 ? round2((b.total / grandTotal) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

function detectAnomalies(
  current: MonthAggregate,
  previous: MonthAggregate,
): CategoryAnomaly[] {
  const anomalies: CategoryAnomaly[] = [];
  collectAnomalies(
    current.incomeBuckets,
    previous.incomeBuckets,
    TransactionType.INCOME,
    anomalies,
  );
  collectAnomalies(
    current.expenseBuckets,
    previous.expenseBuckets,
    TransactionType.EXPENSE,
    anomalies,
  );
  return anomalies.sort(
    (a, b) => Math.abs(b.changePercentage) - Math.abs(a.changePercentage),
  );
}

function collectAnomalies(
  current: Map<string, CategoryBucket>,
  previous: Map<string, CategoryBucket>,
  type: TransactionType,
  out: CategoryAnomaly[],
): void {
  const seen = new Set<string>();

  for (const [categoryId, bucket] of current) {
    seen.add(categoryId);
    const prev = previous.get(categoryId);
    const previousTotal = prev ? prev.total : 0;
    const change = computeChange(previousTotal, bucket.total);
    if (change === null || Math.abs(change) <= ANOMALY_THRESHOLD_PERCENTAGE) {
      continue;
    }
    out.push({
      categoryId,
      name: bucket.name,
      icon: bucket.icon,
      type,
      previousTotal: round2(previousTotal),
      currentTotal: round2(bucket.total),
      changePercentage: round2(change),
    });
  }

  for (const [categoryId, prev] of previous) {
    if (seen.has(categoryId)) continue;
    const change = computeChange(prev.total, 0);
    if (change === null || Math.abs(change) <= ANOMALY_THRESHOLD_PERCENTAGE) {
      continue;
    }
    out.push({
      categoryId,
      name: prev.name,
      icon: prev.icon,
      type,
      previousTotal: round2(prev.total),
      currentTotal: 0,
      changePercentage: round2(change),
    });
  }
}

function computeChange(previous: number, current: number): number | null {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return 100;
  return ((current - previous) / previous) * 100;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function amountToNumber(amount: Prisma.Decimal | number): number {
  return typeof amount === "number" ? amount : amount.toNumber();
}
