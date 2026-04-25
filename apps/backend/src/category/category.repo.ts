import { Injectable } from '@nestjs/common';
import { Category } from '@finance-tracker/database';
import { TransactionType } from '@finance-tracker/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoryRepo {
  constructor(private readonly prisma: PrismaService) {}

  findAllForUser(userId: string, type?: TransactionType): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: {
        OR: [{ userId: null }, { userId }],
        ...(type !== undefined ? { type } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  findById(id: string): Promise<Category | null> {
    return this.prisma.category.findUnique({ where: { id } });
  }

  create(data: { name: string; icon: string; type: TransactionType; userId: string }): Promise<Category> {
    return this.prisma.category.create({ data });
  }

  update(id: string, data: { name?: string; icon?: string }): Promise<Category> {
    return this.prisma.category.update({ where: { id }, data });
  }

  delete(id: string): Promise<Category> {
    return this.prisma.category.delete({ where: { id } });
  }

  async hasTransactions(categoryId: string): Promise<boolean> {
    const count = await this.prisma.transaction.count({ where: { categoryId } });
    return count > 0;
  }
}
