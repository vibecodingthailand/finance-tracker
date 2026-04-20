import { Injectable } from "@nestjs/common";
import type { Category, TransactionType } from "@finance-tracker/database";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findForUser(userId: string, type?: TransactionType): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: {
        OR: [{ userId: null }, { userId }],
        ...(type ? { type } : {}),
      },
      orderBy: { name: "asc" },
    });
  }

  findById(id: string): Promise<Category | null> {
    return this.prisma.category.findUnique({ where: { id } });
  }

  create(input: {
    name: string;
    icon: string;
    type: TransactionType;
    userId: string;
  }): Promise<Category> {
    return this.prisma.category.create({ data: input });
  }

  update(
    id: string,
    data: { name?: string; icon?: string },
  ): Promise<Category> {
    return this.prisma.category.update({ where: { id }, data });
  }

  delete(id: string): Promise<Category> {
    return this.prisma.category.delete({ where: { id } });
  }

  countTransactions(categoryId: string): Promise<number> {
    return this.prisma.transaction.count({ where: { categoryId } });
  }
}
