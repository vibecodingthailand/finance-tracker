import { Injectable } from '@nestjs/common';
import { Transaction, TransactionSource, User } from '@finance-tracker/database';
import { TransactionType } from '@finance-tracker/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LineRepo {
  constructor(private readonly prisma: PrismaService) {}

  findOrCreateByLineUserId(lineUserId: string): Promise<User> {
    return this.prisma.user.upsert({
      where: { lineUserId },
      update: {},
      create: {
        lineUserId,
        email: `line:${lineUserId}`,
        password: '',
        name: 'LINE User',
      },
    });
  }

  createTransaction(data: {
    amount: number;
    type: TransactionType;
    description: string;
    categoryId: string;
    userId: string;
  }): Promise<Transaction> {
    return this.prisma.transaction.create({
      data: { ...data, source: TransactionSource.LINE },
    });
  }

  findLastTransaction(userId: string): Promise<Transaction | null> {
    return this.prisma.transaction.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  deleteTransaction(id: string): Promise<Transaction> {
    return this.prisma.transaction.delete({ where: { id } });
  }

  async mergeLineUserIntoWebUser(
    lineUserInternalId: string,
    lineUserId: string,
    webUserId: string,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.transaction.updateMany({
        where: { userId: lineUserInternalId },
        data: { userId: webUserId },
      }),
      this.prisma.user.delete({ where: { id: lineUserInternalId } }),
      this.prisma.user.update({
        where: { id: webUserId },
        data: { lineUserId },
      }),
    ]);
  }

  async sumByPeriod(
    userId: string,
    start: Date,
    end: Date,
  ): Promise<{ income: number; expense: number }> {
    const rows = await this.prisma.transaction.groupBy({
      by: ['type'],
      where: { userId, createdAt: { gte: start, lt: end } },
      _sum: { amount: true },
    });
    const income = Number(rows.find((r) => r.type === 'INCOME')?._sum.amount ?? 0);
    const expense = Number(rows.find((r) => r.type === 'EXPENSE')?._sum.amount ?? 0);
    return { income, expense };
  }
}
