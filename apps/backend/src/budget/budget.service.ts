import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  BudgetStatusResponse,
  CreateBudgetDto,
  TransactionType,
  UpdateBudgetDto,
} from "@finance-tracker/shared";
import type { Prisma } from "@finance-tracker/database";
import { CategoriesRepository } from "../categories/categories.repository";
import { TransactionsRepository } from "../transactions/transactions.repository";
import { BudgetRepository, BudgetWithCategory } from "./budget.repository";

@Injectable()
export class BudgetService {
  constructor(
    private readonly repo: BudgetRepository,
    private readonly categories: CategoriesRepository,
    private readonly transactions: TransactionsRepository,
  ) {}

  async create(userId: string, dto: CreateBudgetDto): Promise<void> {
    this.validatePeriod(dto.month, dto.year);
    await this.validateExpenseCategory(userId, dto.categoryId);
    const duplicate = await this.repo.findForPeriodKey({
      userId,
      categoryId: dto.categoryId,
      month: dto.month,
      year: dto.year,
    });
    if (duplicate) {
      throw new ConflictException(
        "มีการตั้งงบสำหรับหมวดนี้ในเดือนที่เลือกแล้ว",
      );
    }
    await this.repo.create({
      userId,
      categoryId: dto.categoryId,
      amount: dto.amount,
      month: dto.month,
      year: dto.year,
    });
  }

  async status(
    userId: string,
    month: number,
    year: number,
  ): Promise<BudgetStatusResponse> {
    this.validatePeriod(month, year);

    const budgets = await this.repo.findForUserPeriod(userId, month, year);
    if (budgets.length === 0) return [];

    const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(year, month, 1, 0, 0, 0, 0);
    const rows = await this.transactions.findInRange(userId, startDate, endDate);

    const spentByCategory = new Map<string, number>();
    for (const tx of rows) {
      if (tx.type !== TransactionType.EXPENSE) continue;
      const amount = amountToNumber(tx.amount);
      spentByCategory.set(
        tx.categoryId,
        (spentByCategory.get(tx.categoryId) ?? 0) + amount,
      );
    }

    return budgets.map((b) => {
      const budgetAmount = amountToNumber(b.amount);
      const spentAmount = round2(spentByCategory.get(b.categoryId) ?? 0);
      const percentage =
        budgetAmount > 0 ? round2((spentAmount / budgetAmount) * 100) : 0;
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

  async update(
    userId: string,
    id: string,
    dto: UpdateBudgetDto,
  ): Promise<void> {
    const existing = await this.findOwned(userId, id);
    await this.repo.update(existing.id, { amount: dto.amount });
  }

  async delete(userId: string, id: string): Promise<void> {
    const existing = await this.findOwned(userId, id);
    await this.repo.delete(existing.id);
  }

  private async findOwned(
    userId: string,
    id: string,
  ): Promise<BudgetWithCategory> {
    const budget = await this.repo.findById(id);
    if (!budget) {
      throw new NotFoundException("ไม่พบงบประมาณ");
    }
    if (budget.userId !== userId) {
      throw new ForbiddenException("ไม่มีสิทธิ์เข้าถึงงบประมาณนี้");
    }
    return budget;
  }

  private async validateExpenseCategory(
    userId: string,
    categoryId: string,
  ): Promise<void> {
    const category = await this.categories.findById(categoryId);
    if (!category) {
      throw new NotFoundException("ไม่พบหมวด");
    }
    const accessible = category.userId === null || category.userId === userId;
    if (!accessible) {
      throw new ForbiddenException("ไม่มีสิทธิ์ใช้หมวดนี้");
    }
    if (category.type !== TransactionType.EXPENSE) {
      throw new BadRequestException("ตั้งงบได้เฉพาะหมวดประเภทรายจ่าย");
    }
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

function amountToNumber(amount: Prisma.Decimal | number): number {
  return typeof amount === "number" ? amount : amount.toNumber();
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
