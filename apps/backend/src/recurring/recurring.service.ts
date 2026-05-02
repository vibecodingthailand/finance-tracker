import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Recurring } from '@finance-tracker/database';
import {
  CreateRecurringDto,
  RecurringResponse,
  TransactionType,
  UpdateRecurringDto,
} from '@finance-tracker/shared';
import { RecurringRepo } from './recurring.repo';

type RecurringWithCategory = Recurring & { category: { name: string; icon: string } };

@Injectable()
export class RecurringService {
  constructor(private readonly recurringRepo: RecurringRepo) {}

  private toResponse(r: RecurringWithCategory): RecurringResponse {
    return {
      id: r.id,
      amount: r.amount.toNumber(),
      type: r.type as TransactionType,
      description: r.description,
      categoryId: r.categoryId,
      categoryName: r.category.name,
      categoryIcon: r.category.icon,
      userId: r.userId,
      dayOfMonth: r.dayOfMonth,
      active: r.active,
      createdAt: r.createdAt,
    };
  }

  async findAll(userId: string): Promise<RecurringResponse[]> {
    const items = await this.recurringRepo.findAll(userId);
    return items.map((r) => this.toResponse(r));
  }

  private async validateCategory(
    categoryId: string,
    type: TransactionType,
    userId: string,
  ): Promise<void> {
    const category = await this.recurringRepo.findCategoryForValidation(categoryId);
    if (!category) throw new NotFoundException('Category not found');
    if (category.userId !== null && category.userId !== userId) {
      throw new ForbiddenException('Category not accessible');
    }
    if (category.type !== type) {
      throw new BadRequestException('Category type does not match recurring type');
    }
  }

  async create(userId: string, dto: CreateRecurringDto): Promise<RecurringResponse> {
    await this.validateCategory(dto.categoryId, dto.type, userId);
    const recurring = await this.recurringRepo.create({
      amount: dto.amount,
      type: dto.type,
      description: dto.description,
      categoryId: dto.categoryId,
      userId,
      dayOfMonth: dto.dayOfMonth,
    });
    return this.toResponse(recurring);
  }

  async update(userId: string, id: string, dto: UpdateRecurringDto): Promise<RecurringResponse> {
    const existing = await this.recurringRepo.findById(id);
    if (!existing) throw new NotFoundException();
    if (existing.userId !== userId) throw new ForbiddenException();

    if (dto.categoryId !== undefined || dto.type !== undefined) {
      const newCategoryId = dto.categoryId ?? existing.categoryId;
      const newType = (dto.type ?? existing.type) as TransactionType;
      await this.validateCategory(newCategoryId, newType, userId);
    }

    const updated = await this.recurringRepo.update(id, dto);
    return this.toResponse(updated);
  }

  async delete(userId: string, id: string): Promise<void> {
    const existing = await this.recurringRepo.findById(id);
    if (!existing) throw new NotFoundException();
    if (existing.userId !== userId) throw new ForbiddenException();
    await this.recurringRepo.delete(id);
  }

  @Cron('1 0 * * *')
  async processRecurring(): Promise<void> {
    const dayOfMonth = new Date().getDate();
    const items = await this.recurringRepo.findActiveByDayOfMonth(dayOfMonth);
    await Promise.all(
      items.map((item) =>
        this.recurringRepo.createTransaction({
          amount: item.amount.toNumber(),
          type: item.type as TransactionType,
          description: item.description ?? undefined,
          categoryId: item.categoryId,
          userId: item.userId,
        }),
      ),
    );
  }
}
