import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CategoryBreakdown,
  CreateTransactionDto,
  DailyTotal,
  ExportQueryDto,
  PaginatedTransactions,
  SummaryQueryDto,
  SummaryResponse,
  TransactionQueryDto,
  TransactionResponse,
  TransactionType,
  UpdateTransactionDto,
} from "@finance-tracker/shared";
import type {
  Prisma,
  TransactionType as PrismaTransactionType,
} from "@finance-tracker/database";
import { CategoriesRepository } from "../categories/categories.repository";
import {
  TransactionWithCategory,
  TransactionsRepository,
} from "./transactions.repository";

const DEFAULT_LIMIT = 20;

@Injectable()
export class TransactionsService {
  constructor(
    private readonly repo: TransactionsRepository,
    private readonly categories: CategoriesRepository,
  ) {}

  async create(
    userId: string,
    dto: CreateTransactionDto,
  ): Promise<TransactionResponse> {
    await this.validateCategoryForType(userId, dto.categoryId, dto.type);
    const created = await this.repo.create({
      userId,
      categoryId: dto.categoryId,
      amount: dto.amount,
      type: dto.type as PrismaTransactionType,
      description: dto.description ?? null,
    });
    return toResponse(created);
  }

  async list(
    userId: string,
    query: TransactionQueryDto,
  ): Promise<PaginatedTransactions> {
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_LIMIT;
    const { rows, total } = await this.repo.list({
      userId,
      page,
      limit,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      categoryId: query.categoryId,
      type: query.type as PrismaTransactionType | undefined,
    });
    return { data: rows.map(toResponse), total, page, limit };
  }

  async summary(
    userId: string,
    query: SummaryQueryDto,
  ): Promise<SummaryResponse> {
    const now = new Date();
    const month = query.month ?? now.getMonth() + 1;
    const year = query.year ?? now.getFullYear();
    const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(year, month, 1, 0, 0, 0, 0);

    const rows = await this.repo.findInRange(userId, startDate, endDate);

    let totalIncome = 0;
    let totalExpense = 0;
    const incomeBuckets = new Map<string, CategoryBucket>();
    const expenseBuckets = new Map<string, CategoryBucket>();
    const dailyMap = new Map<string, { income: number; expense: number }>();

    for (const tx of rows) {
      const amount = amountToNumber(tx.amount);
      const dateKey = formatLocalDate(tx.createdAt);
      const day = dailyMap.get(dateKey) ?? { income: 0, expense: 0 };

      if (tx.type === "INCOME") {
        totalIncome += amount;
        accumulate(incomeBuckets, tx.categoryId, tx.category, amount);
        day.income += amount;
      } else {
        totalExpense += amount;
        accumulate(expenseBuckets, tx.categoryId, tx.category, amount);
        day.expense += amount;
      }
      dailyMap.set(dateKey, day);
    }

    return {
      totalIncome: round2(totalIncome),
      totalExpense: round2(totalExpense),
      balance: round2(totalIncome - totalExpense),
      byCategoryIncome: toBreakdowns(incomeBuckets, totalIncome),
      byCategoryExpense: toBreakdowns(expenseBuckets, totalExpense),
      dailyTotals: buildDailyTotals(year, month, dailyMap),
    };
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateTransactionDto,
  ): Promise<TransactionResponse> {
    const existing = await this.findOwned(userId, id);
    const nextType = (dto.type ?? existing.type) as TransactionType;
    const nextCategoryId = dto.categoryId ?? existing.categoryId;
    if (dto.type !== undefined || dto.categoryId !== undefined) {
      await this.validateCategoryForType(userId, nextCategoryId, nextType);
    }
    const updated = await this.repo.update(id, {
      amount: dto.amount,
      type: dto.type as PrismaTransactionType | undefined,
      description: dto.description,
      categoryId: dto.categoryId,
    });
    return toResponse(updated);
  }

  async delete(userId: string, id: string): Promise<void> {
    const existing = await this.findOwned(userId, id);
    await this.repo.delete(existing.id);
  }

  async exportCsv(
    userId: string,
    query: ExportQueryDto,
  ): Promise<{ filename: string; content: string }> {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);
    if (startDate > endDate) {
      throw new BadRequestException("startDate ต้องไม่มากกว่า endDate");
    }
    const rows = await this.repo.findForExport(userId, startDate, endDate);
    const content = buildCsv(rows);
    const filename = `transactions-${toDateStamp(startDate)}-${toDateStamp(endDate)}.csv`;
    return { filename, content };
  }

  private async findOwned(
    userId: string,
    id: string,
  ): Promise<TransactionWithCategory> {
    const tx = await this.repo.findById(id);
    if (!tx) {
      throw new NotFoundException("ไม่พบรายการ");
    }
    if (tx.userId !== userId) {
      throw new ForbiddenException("ไม่มีสิทธิ์เข้าถึงรายการนี้");
    }
    return tx;
  }

  private async validateCategoryForType(
    userId: string,
    categoryId: string,
    type: TransactionType,
  ): Promise<void> {
    const category = await this.categories.findById(categoryId);
    if (!category) {
      throw new NotFoundException("ไม่พบหมวด");
    }
    const accessible =
      category.userId === null || category.userId === userId;
    if (!accessible) {
      throw new ForbiddenException("ไม่มีสิทธิ์ใช้หมวดนี้");
    }
    if (category.type !== type) {
      throw new BadRequestException("ประเภทหมวดไม่ตรงกับประเภทรายการ");
    }
  }
}

interface CategoryBucket {
  name: string;
  icon: string;
  total: number;
}

function accumulate(
  map: Map<string, CategoryBucket>,
  categoryId: string,
  category: { name: string; icon: string },
  amount: number,
): void {
  const existing = map.get(categoryId);
  if (existing) {
    existing.total += amount;
  } else {
    map.set(categoryId, { name: category.name, icon: category.icon, total: amount });
  }
}

function toBreakdowns(
  buckets: Map<string, CategoryBucket>,
  grandTotal: number,
): CategoryBreakdown[] {
  return [...buckets.values()]
    .map((b) => ({
      name: b.name,
      icon: b.icon,
      total: round2(b.total),
      percentage:
        grandTotal > 0 ? round2((b.total / grandTotal) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

function buildDailyTotals(
  year: number,
  month: number,
  dailyMap: Map<string, { income: number; expense: number }>,
): DailyTotal[] {
  const lastDay = new Date(year, month, 0).getDate();
  const results: DailyTotal[] = [];
  for (let d = 1; d <= lastDay; d++) {
    const key = formatLocalDate(new Date(year, month - 1, d));
    const entry = dailyMap.get(key) ?? { income: 0, expense: 0 };
    results.push({
      date: key,
      income: round2(entry.income),
      expense: round2(entry.expense),
    });
  }
  return results;
}

function formatLocalDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function amountToNumber(amount: Prisma.Decimal | number): number {
  return typeof amount === "number" ? amount : amount.toNumber();
}

const CSV_HEADERS = ["วันที่", "รายละเอียด", "หมวดหมู่", "จำนวน", "ประเภท"];
const CSV_BOM = "\uFEFF";
const thaiDateFormatter = new Intl.DateTimeFormat("th-TH", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const amountFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function buildCsv(rows: TransactionWithCategory[]): string {
  const lines = [CSV_HEADERS.map(csvEscape).join(",")];
  for (const tx of rows) {
    const amount = amountToNumber(tx.amount);
    lines.push(
      [
        thaiDateFormatter.format(tx.createdAt),
        tx.description ?? "",
        tx.category.name,
        amountFormatter.format(amount),
        tx.type === "INCOME" ? "รายรับ" : "รายจ่าย",
      ]
        .map(csvEscape)
        .join(","),
    );
  }
  return CSV_BOM + lines.join("\r\n");
}

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toDateStamp(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

function toResponse(tx: TransactionWithCategory): TransactionResponse {
  return {
    id: tx.id,
    amount: amountToNumber(tx.amount),
    type: tx.type as TransactionType,
    description: tx.description,
    categoryId: tx.categoryId,
    category: {
      id: tx.category.id,
      name: tx.category.name,
      icon: tx.category.icon,
    },
    createdAt: tx.createdAt.toISOString(),
  };
}
