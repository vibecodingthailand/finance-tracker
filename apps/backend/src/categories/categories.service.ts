import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CategoryResponse,
  CreateCategoryDto,
  TransactionType,
  UpdateCategoryDto,
} from "@finance-tracker/shared";
import type {
  Category,
  TransactionType as PrismaTransactionType,
} from "@finance-tracker/database";
import { CategoriesRepository } from "./categories.repository";

@Injectable()
export class CategoriesService {
  constructor(private readonly repo: CategoriesRepository) {}

  async list(
    userId: string,
    type?: TransactionType,
  ): Promise<CategoryResponse[]> {
    const rows = await this.repo.findForUser(
      userId,
      type as PrismaTransactionType | undefined,
    );
    return rows.map(toResponse);
  }

  async create(
    userId: string,
    dto: CreateCategoryDto,
  ): Promise<CategoryResponse> {
    const created = await this.repo.create({
      name: dto.name,
      icon: dto.icon,
      type: dto.type as PrismaTransactionType,
      userId,
    });
    return toResponse(created);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryResponse> {
    const existing = await this.findOwned(userId, id, "แก้ไข");
    const updated = await this.repo.update(existing.id, {
      name: dto.name,
      icon: dto.icon,
    });
    return toResponse(updated);
  }

  async delete(userId: string, id: string): Promise<void> {
    const existing = await this.findOwned(userId, id, "ลบ");
    const txCount = await this.repo.countTransactions(existing.id);
    if (txCount > 0) {
      throw new ConflictException("ไม่สามารถลบหมวดที่มีรายการอยู่ได้");
    }
    await this.repo.delete(existing.id);
  }

  private async findOwned(
    userId: string,
    id: string,
    action: string,
  ): Promise<Category> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException("ไม่พบหมวด");
    }
    if (existing.userId === null) {
      throw new ForbiddenException(`ไม่สามารถ${action}หมวดเริ่มต้นได้`);
    }
    if (existing.userId !== userId) {
      throw new ForbiddenException(`ไม่มีสิทธิ์${action}หมวดนี้`);
    }
    return existing;
  }
}

function toResponse(c: Category): CategoryResponse {
  return {
    id: c.id,
    name: c.name,
    icon: c.icon,
    type: c.type as TransactionType,
    userId: c.userId,
  };
}
