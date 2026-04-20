import { Injectable } from "@nestjs/common";
import type { Budget, Prisma } from "@finance-tracker/database";
import { PrismaService } from "../prisma/prisma.service";

export type BudgetWithCategory = Prisma.BudgetGetPayload<{
  include: { category: true };
}>;

@Injectable()
export class BudgetRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<BudgetWithCategory | null> {
    return this.prisma.budget.findUnique({
      where: { id },
      include: { category: true },
    });
  }

  findForUserPeriod(
    userId: string,
    month: number,
    year: number,
  ): Promise<BudgetWithCategory[]> {
    return this.prisma.budget.findMany({
      where: { userId, month, year },
      include: { category: true },
      orderBy: { createdAt: "asc" },
    });
  }

  findForPeriodKey(input: {
    userId: string;
    categoryId: string;
    month: number;
    year: number;
  }): Promise<Budget | null> {
    return this.prisma.budget.findUnique({
      where: {
        userId_categoryId_month_year: {
          userId: input.userId,
          categoryId: input.categoryId,
          month: input.month,
          year: input.year,
        },
      },
    });
  }

  create(input: {
    userId: string;
    categoryId: string;
    amount: number;
    month: number;
    year: number;
  }): Promise<Budget> {
    return this.prisma.budget.create({ data: input });
  }

  update(id: string, data: { amount: number }): Promise<Budget> {
    return this.prisma.budget.update({ where: { id }, data });
  }

  delete(id: string): Promise<Budget> {
    return this.prisma.budget.delete({ where: { id } });
  }
}
