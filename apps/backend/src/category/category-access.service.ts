import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TransactionType } from '@finance-tracker/shared';
import { CategoryRepo } from './category.repo';

@Injectable()
export class CategoryAccessService {
  constructor(private readonly categoryRepo: CategoryRepo) {}

  async ensureAccess(
    categoryId: string,
    userId: string,
    expectedType?: TransactionType,
  ): Promise<void> {
    const category = await this.categoryRepo.findById(categoryId);
    if (!category) throw new NotFoundException('Category not found');
    if (category.userId !== null && category.userId !== userId) {
      throw new ForbiddenException('Category not accessible');
    }
    if (expectedType !== undefined && category.type !== expectedType) {
      throw new BadRequestException('Category type does not match transaction type');
    }
  }
}
