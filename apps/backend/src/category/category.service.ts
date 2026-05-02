import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Category } from '@finance-tracker/database';
import {
  CategoryResponse,
  CreateCategoryDto,
  GetCategoriesQueryDto,
  UpdateCategoryDto,
} from '@finance-tracker/shared';
import { toCategoryResponse } from './category.mapper';
import { CategoryRepo } from './category.repo';

@Injectable()
export class CategoryService {
  constructor(private readonly categoryRepo: CategoryRepo) {}

  async findAll(userId: string, query: GetCategoriesQueryDto): Promise<CategoryResponse[]> {
    const categories = await this.categoryRepo.findAllForUser(userId, query.type);
    return categories.map(toCategoryResponse);
  }

  async create(userId: string, dto: CreateCategoryDto): Promise<CategoryResponse> {
    const category = await this.categoryRepo.create({
      name: dto.name,
      icon: dto.icon,
      type: dto.type,
      userId,
    });
    return toCategoryResponse(category);
  }

  async update(userId: string, id: string, dto: UpdateCategoryDto): Promise<CategoryResponse> {
    const category = await this.categoryRepo.findById(id);
    this.assertUserOwns(category);
    if (category.userId !== userId) throw new ForbiddenException();
    const updated = await this.categoryRepo.update(id, dto);
    return toCategoryResponse(updated);
  }

  async delete(userId: string, id: string): Promise<void> {
    const category = await this.categoryRepo.findById(id);
    this.assertUserOwns(category);
    if (category.userId !== userId) throw new ForbiddenException();
    if (await this.categoryRepo.hasTransactions(id)) {
      throw new ConflictException('Category has existing transactions');
    }
    await this.categoryRepo.delete(id);
  }

  private assertUserOwns(
    category: Category | null,
  ): asserts category is Category & { userId: string } {
    if (!category) throw new NotFoundException();
    if (category.userId === null) {
      throw new ForbiddenException('Cannot modify default categories');
    }
  }
}
