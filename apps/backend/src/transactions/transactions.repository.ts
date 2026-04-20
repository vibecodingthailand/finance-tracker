import { Injectable } from "@nestjs/common";
import type {
  Prisma,
  Transaction,
  TransactionSource,
  TransactionType,
} from "@finance-tracker/database";
import { PrismaService } from "../prisma/prisma.service";

export type TransactionWithCategory = Prisma.TransactionGetPayload<{
  include: { category: true };
}>;

export interface ListFilter {
  userId: string;
  page: number;
  limit: number;
  startDate?: Date;
  endDate?: Date;
  categoryId?: string;
  type?: TransactionType;
}

@Injectable()
export class TransactionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<TransactionWithCategory | null> {
    return this.prisma.transaction.findUnique({
      where: { id },
      include: { category: true },
    });
  }

  create(input: {
    userId: string;
    categoryId: string;
    amount: number;
    type: TransactionType;
    description: string | null;
    source?: TransactionSource;
  }): Promise<TransactionWithCategory> {
    return this.prisma.transaction.create({
      data: input,
      include: { category: true },
    });
  }

  update(
    id: string,
    data: {
      amount?: number;
      type?: TransactionType;
      description?: string;
      categoryId?: string;
    },
  ): Promise<TransactionWithCategory> {
    return this.prisma.transaction.update({
      where: { id },
      data,
      include: { category: true },
    });
  }

  delete(id: string): Promise<Transaction> {
    return this.prisma.transaction.delete({ where: { id } });
  }

  async list(filter: ListFilter): Promise<{
    rows: TransactionWithCategory[];
    total: number;
  }> {
    const where = this.buildWhere(filter);
    const [rows, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
        include: { category: true },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.transaction.count({ where }),
    ]);
    return { rows, total };
  }

  findInRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<TransactionWithCategory[]> {
    return this.prisma.transaction.findMany({
      where: {
        userId,
        createdAt: { gte: startDate, lt: endDate },
      },
      include: { category: true },
      orderBy: { createdAt: "asc" },
    });
  }

  findForExport(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<TransactionWithCategory[]> {
    return this.prisma.transaction.findMany({
      where: {
        userId,
        createdAt: { gte: startDate, lte: endDate },
      },
      include: { category: true },
      orderBy: { createdAt: "asc" },
    });
  }

  private buildWhere(filter: ListFilter): Prisma.TransactionWhereInput {
    const where: Prisma.TransactionWhereInput = { userId: filter.userId };
    if (filter.type) where.type = filter.type;
    if (filter.categoryId) where.categoryId = filter.categoryId;
    if (filter.startDate || filter.endDate) {
      where.createdAt = {
        ...(filter.startDate ? { gte: filter.startDate } : {}),
        ...(filter.endDate ? { lte: filter.endDate } : {}),
      };
    }
    return where;
  }
}
