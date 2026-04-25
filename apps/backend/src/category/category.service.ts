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
  TransactionType,
  UpdateCategoryDto,
} from '@finance-tracker/shared';
import { CategoryRepo } from './category.repo';

@Injectable()
export class CategoryService {
  constructor(private readonly categoryRepo: CategoryRepo) {}

  private toResponse(c: Category): CategoryResponse {
    return {
      id: c.id,
      name: c.name,
      icon: c.icon,
      type: c.type as TransactionType,
      userId: c.userId,
      createdAt: c.createdAt,
    };
  }

  async findAll(userId: string, query: GetCategoriesQueryDto): Promise<CategoryResponse[]> {
    const categories = await this.categoryRepo.findAllForUser(userId, query.type);
    return categories.map((c) => this.toResponse(c));
  }

  async create(userId: string, dto: CreateCategoryDto): Promise<CategoryResponse> {
    const category = await this.categoryRepo.create({
      name: dto.name,
      icon: dto.icon,
      type: dto.type,
      userId,
    });
    return this.toResponse(category);
  }

  async update(userId: string, id: string, dto: UpdateCategoryDto): Promise<CategoryResponse> {
    const category = await this.categoryRepo.findById(id);
    if (!category) throw new NotFoundException();
    if (category.userId === null) {
      throw new ForbiddenException('Cannot modify default categories');
    }
    if (category.userId !== userId) throw new ForbiddenException();
    const updated = await this.categoryRepo.update(id, dto);
    return this.toResponse(updated);
  }

  async delete(userId: string, id: string): Promise<void> {
    const category = await this.categoryRepo.findById(id);
    if (!category) throw new NotFoundException();
    if (category.userId === null) {
      throw new ForbiddenException('Cannot delete default categories');
    }
    if (category.userId !== userId) throw new ForbiddenException();
    if (await this.categoryRepo.hasTransactions(id)) {
      throw new ConflictException('Category has existing transactions');
    }
    await this.categoryRepo.delete(id);
  }
}
