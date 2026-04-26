import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Budget } from '@finance-tracker/database';
import {
  BudgetStatusResponse,
  CreateBudgetDto,
  UpdateBudgetDto,
} from '@finance-tracker/shared';
import { BudgetRepo } from './budget.repo';

interface BudgetResponse {
  id: string;
  amount: number;
  categoryId: string;
  userId: string;
  month: number;
  year: number;
  createdAt: Date;
}

@Injectable()
export class BudgetService {
  constructor(private readonly budgetRepo: BudgetRepo) {}

  private toResponse(budget: Budget): BudgetResponse {
    return {
      id: budget.id,
      amount: budget.amount.toNumber(),
      categoryId: budget.categoryId,
      userId: budget.userId,
      month: budget.month,
      year: budget.year,
      createdAt: budget.createdAt,
    };
  }

  async create(userId: string, dto: CreateBudgetDto): Promise<BudgetResponse> {
    const category = await this.budgetRepo.findCategoryForValidation(dto.categoryId);
    if (!category) throw new NotFoundException('Category not found');
    if (category.userId !== null && category.userId !== userId) {
      throw new ForbiddenException('Category not accessible');
    }

    const existing = await this.budgetRepo.findByConstraint(
      userId,
      dto.categoryId,
      dto.month,
      dto.year,
    );
    if (existing) throw new ConflictException('Budget already exists for this category and period');

    const budget = await this.budgetRepo.create({
      amount: dto.amount,
      categoryId: dto.categoryId,
      userId,
      month: dto.month,
      year: dto.year,
    });
    return this.toResponse(budget);
  }

  async getStatus(userId: string, month?: number, year?: number): Promise<BudgetStatusResponse> {
    const now = new Date();
    const resolvedMonth = month ?? now.getMonth() + 1;
    const resolvedYear = year ?? now.getFullYear();

    const budgets = await this.budgetRepo.findBudgetsWithCategory(
      userId,
      resolvedMonth,
      resolvedYear,
    );
    if (budgets.length === 0) return [];

    const categoryIds = budgets.map((b) => b.categoryId);
    const spentRows = await this.budgetRepo.findSpentByCategory(
      userId,
      resolvedMonth,
      resolvedYear,
      categoryIds,
    );

    const spentMap = new Map<string, number>();
    for (const row of spentRows) {
      spentMap.set(row.categoryId, row._sum.amount?.toNumber() ?? 0);
    }

    return budgets.map((b) => {
      const budgetAmount = b.amount.toNumber();
      const spentAmount = spentMap.get(b.categoryId) ?? 0;
      const percentage = budgetAmount > 0 ? Math.round((spentAmount / budgetAmount) * 1000) / 10 : 0;
      return {
        categoryName: b.category.name,
        categoryIcon: b.category.icon,
        budgetAmount,
        spentAmount,
        percentage,
        isOverBudget: spentAmount > budgetAmount,
      };
    });
  }

  async update(userId: string, id: string, dto: UpdateBudgetDto): Promise<BudgetResponse> {
    const budget = await this.budgetRepo.findById(id);
    if (!budget) throw new NotFoundException();
    if (budget.userId !== userId) throw new ForbiddenException();

    const updated = await this.budgetRepo.update(id, dto.amount ?? budget.amount.toNumber());
    return this.toResponse(updated);
  }

  async delete(userId: string, id: string): Promise<void> {
    const budget = await this.budgetRepo.findById(id);
    if (!budget) throw new NotFoundException();
    if (budget.userId !== userId) throw new ForbiddenException();
    await this.budgetRepo.delete(id);
  }
}
