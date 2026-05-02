import { Injectable } from '@nestjs/common';
import { Transaction } from '@finance-tracker/database';
import { TransactionType } from '@finance-tracker/shared';
import { PrismaService } from '../prisma/prisma.service';

interface TransactionFilters {
  page: number;
  limit: number;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  type?: TransactionType;
  search?: string;
}

@Injectable()
export class TransactionRepo {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    userId: string,
    filters: TransactionFilters,
  ): Promise<{ data: Transaction[]; total: number; page: number; limit: number }> {
    const { page, limit, startDate, endDate, categoryId, type, search } = filters;
    const where = {
      userId,
      ...(startDate ?? endDate
        ? {
            createdAt: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate) } : {}),
            },
          }
        : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(type ? { type } : {}),
      ...(search && search.trim() !== ''
        ? { description: { contains: search.trim(), mode: 'insensitive' as const } }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  findForSummary(userId: string, startDate: Date, endDate: Date) {
    return this.prisma.transaction.findMany({
      where: { userId, createdAt: { gte: startDate, lte: endDate } },
      include: { category: { select: { name: true, icon: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  findById(id: string): Promise<Transaction | null> {
    return this.prisma.transaction.findUnique({ where: { id } });
  }

  create(data: {
    amount: number;
    type: TransactionType;
    description?: string;
    categoryId: string;
    userId: string;
  }): Promise<Transaction> {
    return this.prisma.transaction.create({ data });
  }

  update(
    id: string,
    data: { amount?: number; type?: TransactionType; description?: string; categoryId?: string },
  ): Promise<Transaction> {
    return this.prisma.transaction.update({ where: { id }, data });
  }

  delete(id: string): Promise<Transaction> {
    return this.prisma.transaction.delete({ where: { id } });
  }
}
