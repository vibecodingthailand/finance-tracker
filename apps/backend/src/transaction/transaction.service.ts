import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
import { TransactionRepo } from './transaction.repo';

@Injectable()
export class TransactionService {
  constructor(private readonly transactionRepo: TransactionRepo) {}

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

  private async validateCategory(
    categoryId: string,
    type: TransactionType,
    userId: string,
  ): Promise<void> {
    const category = await this.transactionRepo.findCategoryForValidation(categoryId);
    if (!category) throw new NotFoundException('Category not found');
    if (category.userId !== null && category.userId !== userId) {
      throw new ForbiddenException('Category not accessible');
    }
    if (category.type !== type) {
      throw new BadRequestException('Category type does not match transaction type');
    }
  }

  async create(userId: string, dto: CreateTransactionDto): Promise<TransactionResponse> {
    await this.validateCategory(dto.categoryId, dto.type, userId);
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

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const transactions = await this.transactionRepo.findForSummary(userId, startDate, endDate);

    let totalIncome = 0;
    let totalExpense = 0;
    const expenseByCat = new Map<string, { name: string; icon: string; total: number }>();
    const incomeByCat = new Map<string, { name: string; icon: string; total: number }>();
    const dailyMap = new Map<string, { income: number; expense: number }>();

    for (const t of transactions) {
      const amount = t.amount.toNumber();
      const date = `${String(year)}-${String(month).padStart(2, '0')}-${String(t.createdAt.getDate()).padStart(2, '0')}`;

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

    const toBreakdown = (
      map: Map<string, { name: string; icon: string; total: number }>,
      grandTotal: number,
    ): CategoryBreakdown[] =>
      Array.from(map.values())
        .map((c) => ({
          name: c.name,
          icon: c.icon,
          total: c.total,
          percentage: grandTotal > 0 ? Math.round((c.total / grandTotal) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.total - a.total);

    const daysInMonth = new Date(year, month, 0).getDate();
    const dailyTotals: DailyTotal[] = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const date = `${String(year)}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const totals = dailyMap.get(date) ?? { income: 0, expense: 0 };
      return { date, income: totals.income, expense: totals.expense };
    });

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      byCategoryExpense: toBreakdown(expenseByCat, totalExpense),
      byCategoryIncome: toBreakdown(incomeByCat, totalIncome),
      dailyTotals,
    };
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto): Promise<TransactionResponse> {
    const transaction = await this.transactionRepo.findById(id);
    if (!transaction) throw new NotFoundException();
    if (transaction.userId !== userId) throw new ForbiddenException();

    if (dto.categoryId !== undefined || dto.type !== undefined) {
      const newCategoryId = dto.categoryId ?? transaction.categoryId;
      const newType = (dto.type ?? transaction.type) as TransactionType;
      await this.validateCategory(newCategoryId, newType, userId);
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
    if (!transaction) throw new NotFoundException();
    if (transaction.userId !== userId) throw new ForbiddenException();
    await this.transactionRepo.delete(id);
  }
}
