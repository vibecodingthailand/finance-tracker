import { Injectable } from '@nestjs/common';
import { Budget } from '@finance-tracker/database';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BudgetRepo {
  constructor(private readonly prisma: PrismaService) {}

  findBudgetsWithCategory(userId: string, month: number, year: number) {
    return this.prisma.budget.findMany({
      where: { userId, month, year },
      include: { category: { select: { name: true, icon: true } } },
    });
  }

  findSpentByCategory(userId: string, month: number, year: number, categoryIds: string[]) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    return this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        type: 'EXPENSE',
        categoryId: { in: categoryIds },
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });
  }

  findById(id: string): Promise<Budget | null> {
    return this.prisma.budget.findUnique({ where: { id } });
  }

  findByConstraint(
    userId: string,
    categoryId: string,
    month: number,
    year: number,
  ): Promise<Budget | null> {
    return this.prisma.budget.findUnique({
      where: { userId_categoryId_month_year: { userId, categoryId, month, year } },
    });
  }

  findCategoryForValidation(
    categoryId: string,
  ): Promise<{ id: string; userId: string | null } | null> {
    return this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true, userId: true },
    });
  }

  create(data: {
    amount: number;
    categoryId: string;
    userId: string;
    month: number;
    year: number;
  }): Promise<Budget> {
    return this.prisma.budget.create({ data });
  }

  update(id: string, amount: number): Promise<Budget> {
    return this.prisma.budget.update({ where: { id }, data: { amount } });
  }

  delete(id: string): Promise<Budget> {
    return this.prisma.budget.delete({ where: { id } });
  }
}
