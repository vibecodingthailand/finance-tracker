import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TransactionType } from '@finance-tracker/shared';
import { CategoryAccessService } from '../category/category-access.service';
import { TransactionRepo } from './transaction.repo';
import { TransactionService } from './transaction.service';

describe('TransactionService', () => {
  let service: TransactionService;
  let repo: jest.Mocked<TransactionRepo>;
  let categoryAccess: jest.Mocked<CategoryAccessService>;

  const userId = 'user1';
  const makeTransaction = (overrides: Record<string, unknown> = {}) => ({
    id: 'tx1',
    amount: { toNumber: () => 100 },
    type: TransactionType.EXPENSE,
    description: null,
    categoryId: 'cat1',
    userId,
    source: 'WEB',
    createdAt: new Date('2026-04-15T10:00:00Z'),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TransactionService,
        {
          provide: TransactionRepo,
          useValue: {
            findAll: jest.fn(),
            findForSummary: jest.fn(),
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

    service = module.get(TransactionService);
    repo = module.get(TransactionRepo);
    categoryAccess = module.get(CategoryAccessService);
  });

  describe('create', () => {
    it('throws NotFoundException when category not found', async () => {
      categoryAccess.ensureAccess.mockRejectedValue(new NotFoundException());
      await expect(
        service.create(userId, { amount: 100, type: TransactionType.EXPENSE, categoryId: 'cat1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when category belongs to another user', async () => {
      categoryAccess.ensureAccess.mockRejectedValue(new ForbiddenException());
      await expect(
        service.create(userId, { amount: 100, type: TransactionType.EXPENSE, categoryId: 'cat1' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when category type mismatches', async () => {
      categoryAccess.ensureAccess.mockRejectedValue(new BadRequestException());
      await expect(
        service.create(userId, { amount: 100, type: TransactionType.EXPENSE, categoryId: 'cat1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates and returns transaction', async () => {
      categoryAccess.ensureAccess.mockResolvedValue();
      repo.create.mockResolvedValue(makeTransaction() as never);
      const result = await service.create(userId, {
        amount: 100,
        type: TransactionType.EXPENSE,
        categoryId: 'cat1',
      });
      expect(categoryAccess.ensureAccess).toHaveBeenCalledWith('cat1', userId, TransactionType.EXPENSE);
      expect(result).toMatchObject({ id: 'tx1', amount: 100, type: TransactionType.EXPENSE });
    });
  });

  describe('findAll', () => {
    it('returns paginated result with defaults', async () => {
      repo.findAll.mockResolvedValue({ data: [makeTransaction() as never], total: 1, page: 1, limit: 20 });
      const result = await service.findAll(userId, {});
      expect(repo.findAll).toHaveBeenCalledWith(userId, expect.objectContaining({ page: 1, limit: 20 }));
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('forwards search query to repo', async () => {
      repo.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });
      await service.findAll(userId, { search: 'coffee' });
      expect(repo.findAll).toHaveBeenCalledWith(userId, expect.objectContaining({ search: 'coffee' }));
    });
  });

  describe('getSummary', () => {
    it('returns zero totals and correct daily slots when no transactions exist', async () => {
      repo.findForSummary.mockResolvedValue([]);
      const result = await service.getSummary(userId, { month: 2, year: 2026 });
      expect(result.totalIncome).toBe(0);
      expect(result.totalExpense).toBe(0);
      expect(result.balance).toBe(0);
      expect(result.byCategoryExpense).toHaveLength(0);
      expect(result.byCategoryIncome).toHaveLength(0);
      expect(result.dailyTotals).toHaveLength(28);
    });

    it('computes totals and daily breakdown correctly', async () => {
      const expenseTx = makeTransaction({
        type: TransactionType.EXPENSE,
        amount: { toNumber: () => 200 },
        createdAt: new Date('2026-04-10T10:00:00Z'),
        category: { name: 'Food', icon: '🍔' },
      });
      const incomeTx = makeTransaction({
        type: TransactionType.INCOME,
        amount: { toNumber: () => 500 },
        createdAt: new Date('2026-04-15T10:00:00Z'),
        categoryId: 'cat2',
        category: { name: 'Salary', icon: '💰' },
      });
      repo.findForSummary.mockResolvedValue([expenseTx, incomeTx] as never);

      const result = await service.getSummary(userId, { month: 4, year: 2026 });

      expect(result.totalIncome).toBe(500);
      expect(result.totalExpense).toBe(200);
      expect(result.balance).toBe(300);
      expect(result.byCategoryExpense).toHaveLength(1);
      expect(result.byCategoryExpense[0]).toMatchObject({ name: 'Food', total: 200, percentage: 100 });
      expect(result.byCategoryIncome).toHaveLength(1);
      expect(result.dailyTotals).toHaveLength(30);
      const day10 = result.dailyTotals.find((d) => d.date === '2026-04-10');
      expect(day10).toEqual({ date: '2026-04-10', income: 0, expense: 200 });
    });
  });

  describe('findAll pagination edge cases', () => {
    it('page 0 passes 0 to repo (exposes ?? behavior)', async () => {
      repo.findAll.mockResolvedValue({ data: [], total: 0, page: 0, limit: 20 });
      await service.findAll(userId, { page: 0 });
      expect(repo.findAll).toHaveBeenCalledWith(userId, expect.objectContaining({ page: 0 }));
    });

    it('page beyond total returns empty data', async () => {
      repo.findAll.mockResolvedValue({ data: [], total: 5, page: 9999, limit: 20 });
      const result = await service.findAll(userId, { page: 9999 });
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(5);
    });
  });

  describe('update', () => {
    it('throws NotFoundException when transaction not found', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.update(userId, 'tx1', { amount: 50 })).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for another user transaction', async () => {
      repo.findById.mockResolvedValue(makeTransaction({ userId: 'other' }) as never);
      await expect(service.update(userId, 'tx1', { amount: 50 })).rejects.toThrow(ForbiddenException);
    });

    it('validates new category when categoryId changes', async () => {
      repo.findById.mockResolvedValue(makeTransaction() as never);
      categoryAccess.ensureAccess.mockRejectedValue(new BadRequestException());
      await expect(
        service.update(userId, 'tx1', { categoryId: 'cat2' }),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws ForbiddenException when updating with another user's category", async () => {
      repo.findById.mockResolvedValue(makeTransaction() as never);
      categoryAccess.ensureAccess.mockRejectedValue(new ForbiddenException());
      await expect(
        service.update(userId, 'tx1', { categoryId: 'cat2' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('updates and returns transaction', async () => {
      const updated = makeTransaction({ amount: { toNumber: () => 150 } });
      repo.findById.mockResolvedValue(makeTransaction() as never);
      repo.update.mockResolvedValue(updated as never);
      const result = await service.update(userId, 'tx1', { amount: 150 });
      expect(result.amount).toBe(150);
    });
  });

  describe('delete', () => {
    it('throws NotFoundException when transaction not found', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.delete(userId, 'tx1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for another user transaction', async () => {
      repo.findById.mockResolvedValue(makeTransaction({ userId: 'other' }) as never);
      await expect(service.delete(userId, 'tx1')).rejects.toThrow(ForbiddenException);
    });

    it('deletes successfully', async () => {
      repo.findById.mockResolvedValue(makeTransaction() as never);
      repo.delete.mockResolvedValue(makeTransaction() as never);
      await expect(service.delete(userId, 'tx1')).resolves.toBeUndefined();
    });
  });
});
