import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CategoryAccessService } from '../category/category-access.service';
import { BudgetRepo } from './budget.repo';
import { BudgetService } from './budget.service';

const decimal = (n: number) => ({ toNumber: () => n }) as never;

const mockBudget = {
  id: 'b1',
  amount: decimal(1000),
  categoryId: 'cat1',
  userId: 'user1',
  month: 4,
  year: 2026,
  createdAt: new Date('2026-04-01'),
  updatedAt: new Date('2026-04-01'),
};

describe('BudgetService', () => {
  let service: BudgetService;
  let repo: jest.Mocked<BudgetRepo>;
  let categoryAccess: jest.Mocked<CategoryAccessService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        BudgetService,
        {
          provide: BudgetRepo,
          useValue: {
            findByConstraint: jest.fn(),
            findBudgetsWithCategory: jest.fn(),
            findSpentByCategory: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: CategoryAccessService,
          useValue: { ensureAccess: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(BudgetService);
    repo = module.get(BudgetRepo);
    categoryAccess = module.get(CategoryAccessService);
  });

  describe('create', () => {
    const dto = { amount: 1000, categoryId: 'cat1', month: 4, year: 2026 };

    it('creates a budget and returns response', async () => {
      categoryAccess.ensureAccess.mockResolvedValue();
      repo.findByConstraint.mockResolvedValue(null);
      repo.create.mockResolvedValue(mockBudget);

      const result = await service.create('user1', dto);

      expect(categoryAccess.ensureAccess).toHaveBeenCalledWith('cat1', 'user1');
      expect(result).toMatchObject({ id: 'b1', amount: 1000, month: 4, year: 2026 });
      expect(repo.create).toHaveBeenCalledWith({
        amount: 1000,
        categoryId: 'cat1',
        userId: 'user1',
        month: 4,
        year: 2026,
      });
    });

    it('throws NotFoundException when category does not exist', async () => {
      categoryAccess.ensureAccess.mockRejectedValue(new NotFoundException());
      await expect(service.create('user1', dto)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when category belongs to another user', async () => {
      categoryAccess.ensureAccess.mockRejectedValue(new ForbiddenException());
      await expect(service.create('user1', dto)).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException when budget already exists', async () => {
      categoryAccess.ensureAccess.mockResolvedValue();
      repo.findByConstraint.mockResolvedValue(mockBudget);
      await expect(service.create('user1', dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('getStatus', () => {
    it('returns empty array when no budgets', async () => {
      repo.findBudgetsWithCategory.mockResolvedValue([]);
      const result = await service.getStatus('user1', 4, 2026);
      expect(result).toEqual([]);
    });

    it('returns status items with calculated spend', async () => {
      const budgetsWithCat = [
        {
          ...mockBudget,
          category: { name: 'Food', icon: '🍔' },
        },
      ] as never;
      repo.findBudgetsWithCategory.mockResolvedValue(budgetsWithCat);
      repo.findSpentByCategory.mockResolvedValue([
        { categoryId: 'cat1', _sum: { amount: decimal(400) } },
      ] as never);

      const result = await service.getStatus('user1', 4, 2026);

      expect(result).toEqual([
        {
          id: 'b1',
          categoryId: 'cat1',
          categoryName: 'Food',
          categoryIcon: '🍔',
          budgetAmount: 1000,
          spentAmount: 400,
          percentage: 40,
          isOverBudget: false,
        },
      ]);
    });

    it('marks item as over budget when spent exceeds budget', async () => {
      const budgetsWithCat = [
        { ...mockBudget, category: { name: 'Food', icon: '🍔' } },
      ] as never;
      repo.findBudgetsWithCategory.mockResolvedValue(budgetsWithCat);
      repo.findSpentByCategory.mockResolvedValue([
        { categoryId: 'cat1', _sum: { amount: decimal(1200) } },
      ] as never);

      const result = await service.getStatus('user1', 4, 2026);
      const item = result[0]!;

      expect(item.isOverBudget).toBe(true);
      expect(item.percentage).toBe(120);
    });

    it('uses zero for spent when no transactions', async () => {
      const budgetsWithCat = [
        { ...mockBudget, category: { name: 'Food', icon: '🍔' } },
      ] as never;
      repo.findBudgetsWithCategory.mockResolvedValue(budgetsWithCat);
      repo.findSpentByCategory.mockResolvedValue([]);

      const result = await service.getStatus('user1', 4, 2026);
      const item = result[0]!;

      expect(item.spentAmount).toBe(0);
      expect(item.percentage).toBe(0);
    });
  });

  describe('update', () => {
    it('updates amount and returns response', async () => {
      const updated = { ...mockBudget, amount: decimal(2000) };
      repo.findById.mockResolvedValue(mockBudget);
      repo.update.mockResolvedValue(updated);

      const result = await service.update('user1', 'b1', { amount: 2000 });

      expect(result.amount).toBe(2000);
      expect(repo.update).toHaveBeenCalledWith('b1', 2000);
    });

    it('throws NotFoundException when budget not found', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.update('user1', 'b1', { amount: 500 })).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when budget belongs to another user', async () => {
      repo.findById.mockResolvedValue({ ...mockBudget, userId: 'other' });
      await expect(service.update('user1', 'b1', { amount: 500 })).rejects.toThrow(ForbiddenException);
    });
  });

  describe('delete', () => {
    it('deletes a budget', async () => {
      repo.findById.mockResolvedValue(mockBudget);
      repo.delete.mockResolvedValue(mockBudget);

      await service.delete('user1', 'b1');

      expect(repo.delete).toHaveBeenCalledWith('b1');
    });

    it('throws NotFoundException when budget not found', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.delete('user1', 'b1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when budget belongs to another user', async () => {
      repo.findById.mockResolvedValue({ ...mockBudget, userId: 'other' });
      await expect(service.delete('user1', 'b1')).rejects.toThrow(ForbiddenException);
    });
  });
});
