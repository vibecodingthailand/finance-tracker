import { Injectable } from "@nestjs/common";
import type { MonthlyInsightCache, Prisma } from "@finance-tracker/database";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class InsightRepository {
  constructor(private readonly prisma: PrismaService) {}

  findFresh(
    userId: string,
    month: number,
    year: number,
    freshSince: Date,
  ): Promise<MonthlyInsightCache | null> {
    return this.prisma.monthlyInsightCache.findFirst({
      where: {
        userId,
        month,
        year,
        cachedAt: { gte: freshSince },
      },
    });
  }

  upsert(input: {
    userId: string;
    month: number;
    year: number;
    data: Prisma.InputJsonValue;
  }): Promise<MonthlyInsightCache> {
    const { userId, month, year, data } = input;
    return this.prisma.monthlyInsightCache.upsert({
      where: { userId_month_year: { userId, month, year } },
      create: { userId, month, year, data, cachedAt: new Date() },
      update: { data, cachedAt: new Date() },
    });
  }
}
