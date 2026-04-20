import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import {
  CreateRecurringDto,
  RecurringResponse,
  TransactionType,
  UpdateRecurringDto,
} from "@finance-tracker/shared";
import type {
  Prisma,
  TransactionType as PrismaTransactionType,
} from "@finance-tracker/database";
import { CategoriesRepository } from "../categories/categories.repository";
import { TransactionsRepository } from "../transactions/transactions.repository";
import {
  RecurringRepository,
  RecurringWithCategory,
} from "./recurring.repository";

@Injectable()
export class RecurringService {
  private readonly logger = new Logger(RecurringService.name);

  constructor(
    private readonly repo: RecurringRepository,
    private readonly categories: CategoriesRepository,
    private readonly transactions: TransactionsRepository,
  ) {}

  async list(userId: string): Promise<RecurringResponse[]> {
    const rows = await this.repo.findForUser(userId);
    return rows.map(toResponse);
  }

  async create(
    userId: string,
    dto: CreateRecurringDto,
  ): Promise<RecurringResponse> {
    await this.validateCategoryForType(userId, dto.categoryId, dto.type);
    const created = await this.repo.create({
      userId,
      categoryId: dto.categoryId,
      amount: dto.amount,
      type: dto.type as PrismaTransactionType,
      description: dto.description ?? null,
      dayOfMonth: dto.dayOfMonth,
    });
    return toResponse(created);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateRecurringDto,
  ): Promise<RecurringResponse> {
    const existing = await this.findOwned(userId, id);
    const nextType = (dto.type ?? existing.type) as TransactionType;
    const nextCategoryId = dto.categoryId ?? existing.categoryId;
    if (dto.type !== undefined || dto.categoryId !== undefined) {
      await this.validateCategoryForType(userId, nextCategoryId, nextType);
    }
    const updated = await this.repo.update(existing.id, {
      amount: dto.amount,
      type: dto.type as PrismaTransactionType | undefined,
      description: dto.description,
      categoryId: dto.categoryId,
      dayOfMonth: dto.dayOfMonth,
      active: dto.active,
    });
    return toResponse(updated);
  }

  async delete(userId: string, id: string): Promise<void> {
    const existing = await this.findOwned(userId, id);
    await this.repo.delete(existing.id);
  }

  @Cron("1 0 * * *")
  async runDailyJob(): Promise<void> {
    const today = new Date();
    await this.runForDate(today);
  }

  async runForDate(date: Date): Promise<number> {
    const day = date.getDate();
    const due = await this.repo.findActiveByDayOfMonth(day);
    let created = 0;
    for (const recurring of due) {
      try {
        await this.transactions.create({
          userId: recurring.userId,
          categoryId: recurring.categoryId,
          amount: amountToNumber(recurring.amount),
          type: recurring.type,
          description: recurring.description,
          source: "RECURRING",
        });
        created += 1;
      } catch (err) {
        this.logger.error(
          `Failed to create transaction for recurring ${recurring.id}`,
          err instanceof Error ? err.stack : String(err),
        );
      }
    }
    return created;
  }

  private async findOwned(
    userId: string,
    id: string,
  ): Promise<RecurringWithCategory> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException("ไม่พบรายการซ้ำ");
    }
    if (existing.userId !== userId) {
      throw new ForbiddenException("ไม่มีสิทธิ์เข้าถึงรายการนี้");
    }
    return existing;
  }

  private async validateCategoryForType(
    userId: string,
    categoryId: string,
    type: TransactionType,
  ): Promise<void> {
    const category = await this.categories.findById(categoryId);
    if (!category) {
      throw new NotFoundException("ไม่พบหมวด");
    }
    const accessible = category.userId === null || category.userId === userId;
    if (!accessible) {
      throw new ForbiddenException("ไม่มีสิทธิ์ใช้หมวดนี้");
    }
    if (category.type !== type) {
      throw new BadRequestException("ประเภทหมวดไม่ตรงกับประเภทรายการ");
    }
  }
}

function amountToNumber(amount: Prisma.Decimal | number): number {
  return typeof amount === "number" ? amount : amount.toNumber();
}

function toResponse(r: RecurringWithCategory): RecurringResponse {
  return {
    id: r.id,
    amount: amountToNumber(r.amount),
    type: r.type as TransactionType,
    description: r.description,
    categoryId: r.categoryId,
    category: {
      id: r.category.id,
      name: r.category.name,
      icon: r.category.icon,
    },
    dayOfMonth: r.dayOfMonth,
    active: r.active,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}
