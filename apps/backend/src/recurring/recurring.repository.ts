import { Injectable } from "@nestjs/common";
import type {
  Prisma,
  Recurring,
  TransactionType,
} from "@finance-tracker/database";
import { PrismaService } from "../prisma/prisma.service";

export type RecurringWithCategory = Prisma.RecurringGetPayload<{
  include: { category: true };
}>;

@Injectable()
export class RecurringRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<RecurringWithCategory | null> {
    return this.prisma.recurring.findUnique({
      where: { id },
      include: { category: true },
    });
  }

  findForUser(userId: string): Promise<RecurringWithCategory[]> {
    return this.prisma.recurring.findMany({
      where: { userId },
      include: { category: true },
      orderBy: [{ active: "desc" }, { dayOfMonth: "asc" }, { createdAt: "desc" }],
    });
  }

  findActiveByDayOfMonth(dayOfMonth: number): Promise<RecurringWithCategory[]> {
    return this.prisma.recurring.findMany({
      where: { active: true, dayOfMonth },
      include: { category: true },
    });
  }

  create(input: {
    userId: string;
    categoryId: string;
    amount: number;
    type: TransactionType;
    description: string | null;
    dayOfMonth: number;
  }): Promise<RecurringWithCategory> {
    return this.prisma.recurring.create({
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
      dayOfMonth?: number;
      active?: boolean;
    },
  ): Promise<RecurringWithCategory> {
    return this.prisma.recurring.update({
      where: { id },
      data,
      include: { category: true },
    });
  }

  delete(id: string): Promise<Recurring> {
    return this.prisma.recurring.delete({ where: { id } });
  }
}
