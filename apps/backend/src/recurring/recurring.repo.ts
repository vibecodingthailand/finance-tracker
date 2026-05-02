import { Injectable } from '@nestjs/common';
import { Recurring, Transaction, TransactionSource } from '@finance-tracker/database';
import { TransactionType } from '@finance-tracker/shared';
import { PrismaService } from '../prisma/prisma.service';

type RecurringWithCategory = Recurring & { category: { name: string; icon: string } };

@Injectable()
export class RecurringRepo {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string): Promise<RecurringWithCategory[]> {
    return this.prisma.recurring.findMany({
      where: { userId },
      include: { category: { select: { name: true, icon: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string): Promise<Recurring | null> {
    return this.prisma.recurring.findUnique({ where: { id } });
  }

  findActiveByDayOfMonth(dayOfMonth: number): Promise<Recurring[]> {
    return this.prisma.recurring.findMany({ where: { active: true, dayOfMonth } });
  }

  create(data: {
    amount: number;
    type: TransactionType;
    description?: string;
    categoryId: string;
    userId: string;
    dayOfMonth: number;
  }): Promise<RecurringWithCategory> {
    return this.prisma.recurring.create({
      data,
      include: { category: { select: { name: true, icon: true } } },
    });
  }

  update(
    id: string,
    data: {
      amount?: number;
      type?: TransactionType;
      description?: string;
      categoryId?: string;
      dayOfMonth?: number;
      active?: boolean;
    },
  ): Promise<RecurringWithCategory> {
    return this.prisma.recurring.update({
      where: { id },
      data,
      include: { category: { select: { name: true, icon: true } } },
    });
  }

  delete(id: string): Promise<Recurring> {
    return this.prisma.recurring.delete({ where: { id } });
  }

  createTransaction(data: {
    amount: number;
    type: TransactionType;
    description?: string;
    categoryId: string;
    userId: string;
  }): Promise<Transaction> {
    return this.prisma.transaction.create({
      data: { ...data, source: TransactionSource.RECURRING },
    });
  }

  async hasRecurringTransactionToday(
    userId: string,
    categoryId: string,
    amount: number,
  ): Promise<boolean> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const count = await this.prisma.transaction.count({
      where: {
        userId,
        categoryId,
        amount,
        source: TransactionSource.RECURRING,
        createdAt: { gte: startOfToday },
      },
    });
    return count > 0;
  }
}
