import { Injectable } from '@nestjs/common';
import { Transaction } from '@finance-tracker/database';
import {
  CategoryBreakdown,
  CreateTransactionDto,
  DailyTotal,
  GetSummaryQueryDto,
  GetTransactionsQueryDto,
  PaginatedTransactionResponse,
  SummaryResponse,
  TransactionResponse,
  TransactionType,
  UpdateTransactionDto,
} from '@finance-tracker/shared';
import { CategoryAccessService } from '../category/category-access.service';
import { assertOwnership } from '../common/assert-ownership';
import { daysInMonth, formatLocalDate, monthRange } from '../common/date-range';
import { TransactionRepo } from './transaction.repo';

@Injectable()
export class TransactionService {
  constructor(
    private readonly transactionRepo: TransactionRepo,
    private readonly categoryAccess: CategoryAccessService,
  ) {}

  private toResponse(t: Transaction): TransactionResponse {
    return {
      id: t.id,
      amount: t.amount.toNumber(),
      type: t.type as TransactionType,
      description: t.description,
      categoryId: t.categoryId,
      userId: t.userId,
      createdAt: t.createdAt,
    };
  }

  async create(userId: string, dto: CreateTransactionDto): Promise<TransactionResponse> {
    await this.categoryAccess.ensureAccess(dto.categoryId, userId, dto.type);
    const transaction = await this.transactionRepo.create({
      amount: dto.amount,
      type: dto.type,
      description: dto.description,
      categoryId: dto.categoryId,
      userId,
    });
    return this.toResponse(transaction);
  }

  async findAll(userId: string, query: GetTransactionsQueryDto): Promise<PaginatedTransactionResponse> {
    const result = await this.transactionRepo.findAll(userId, {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      startDate: query.startDate,
      endDate: query.endDate,
      categoryId: query.categoryId,
      type: query.type,
      search: query.search,
    });
    return {
      data: result.data.map((t) => this.toResponse(t)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  async getSummary(userId: string, query: GetSummaryQueryDto): Promise<SummaryResponse> {
    const now = new Date();
    const month = query.month ?? now.getMonth() + 1;
    const year = query.year ?? now.getFullYear();
    const { start, end } = monthRange(month, year);

    const transactions = await this.transactionRepo.findForSummary(userId, start, end);

    let totalIncome = 0;
    let totalExpense = 0;
    const expenseByCat = new Map<string, { name: string; icon: string; total: number }>();
    const incomeByCat = new Map<string, { name: string; icon: string; total: number }>();
    const dailyMap = new Map<string, { income: number; expense: number }>();

    for (const t of transactions) {
      const amount = t.amount.toNumber();
      const date = formatLocalDate(t.createdAt);

      const daily = dailyMap.get(date) ?? { income: 0, expense: 0 };
      const catMap = t.type === 'INCOME' ? incomeByCat : expenseByCat;
      const catEntry = catMap.get(t.categoryId) ?? {
        name: t.category.name,
        icon: t.category.icon,
        total: 0,
      };

      if (t.type === 'INCOME') {
        totalIncome += amount;
        daily.income += amount;
        catEntry.total += amount;
        incomeByCat.set(t.categoryId, catEntry);
      } else {
        totalExpense += amount;
        daily.expense += amount;
        catEntry.total += amount;
        expenseByCat.set(t.categoryId, catEntry);
      }

      dailyMap.set(date, daily);
    }

    const days = daysInMonth(month, year);
    const dailyTotals: DailyTotal[] = Array.from({ length: days }, (_, i) => {
      const date = formatLocalDate(new Date(year, month - 1, i + 1));
      const totals = dailyMap.get(date) ?? { income: 0, expense: 0 };
      return { date, income: totals.income, expense: totals.expense };
    });

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      byCategoryExpense: this.toBreakdown(expenseByCat, totalExpense),
      byCategoryIncome: this.toBreakdown(incomeByCat, totalIncome),
      dailyTotals,
    };
  }

  private toBreakdown(
    map: Map<string, { name: string; icon: string; total: number }>,
    grandTotal: number,
  ): CategoryBreakdown[] {
    return Array.from(map.values())
      .map((c) => ({
        name: c.name,
        icon: c.icon,
        total: c.total,
        percentage: grandTotal > 0 ? Math.round((c.total / grandTotal) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto): Promise<TransactionResponse> {
    const transaction = await this.transactionRepo.findById(id);
    assertOwnership(transaction, userId, 'Transaction');

    if (dto.categoryId !== undefined || dto.type !== undefined) {
      const newCategoryId = dto.categoryId ?? transaction.categoryId;
      const newType = (dto.type ?? transaction.type) as TransactionType;
      await this.categoryAccess.ensureAccess(newCategoryId, userId, newType);
    }

    const updated = await this.transactionRepo.update(id, {
      amount: dto.amount,
      type: dto.type,
      description: dto.description,
      categoryId: dto.categoryId,
    });
    return this.toResponse(updated);
  }

  async delete(userId: string, id: string): Promise<void> {
    const transaction = await this.transactionRepo.findById(id);
    assertOwnership(transaction, userId, 'Transaction');
    await this.transactionRepo.delete(id);
  }
}
