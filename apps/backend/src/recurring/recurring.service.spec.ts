import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TransactionType } from '@finance-tracker/shared';
import { CategoryAccessService } from '../category/category-access.service';
import { RecurringRepo } from './recurring.repo';
import { RecurringService } from './recurring.service';

describe('RecurringService', () => {
  let service: RecurringService;
  let repo: jest.Mocked<RecurringRepo>;
  let categoryAccess: jest.Mocked<CategoryAccessService>;

  const userId = 'user1';
  const makeRecurring = (overrides: Record<string, unknown> = {}) => ({
    id: 'rec1',
    amount: { toNumber: () => 500 },
    type: TransactionType.EXPENSE,
    description: 'Netflix',
    categoryId: 'cat1',
    userId,
    dayOfMonth: 15,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    category: { name: 'Entertainment', icon: '🎬' },
    ...overrides,
  });

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        RecurringService,
        {
          provide: RecurringRepo,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            findActiveByDayOfMonth: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            createTransaction: jest.fn(),
            hasRecurringTransactionToday: jest.fn().mockResolvedValue(false),
          },
        },
        {
          provide: CategoryAccessService,
          useValue: { ensureAccess: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(RecurringService);
    repo = module.get(RecurringRepo);
    categoryAccess = module.get(CategoryAccessService);
  });

  describe('findAll', () => {
    it('returns mapped recurrings', async () => {
      repo.findAll.mockResolvedValue([makeRecurring()] as never);
      const result = await service.findAll(userId);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: 'rec1', amount: 500, categoryName: 'Entertainment' });
    });
  });

  describe('create', () => {
    const dto = {
      amount: 500,
      type: TransactionType.EXPENSE,
      description: 'Netflix',
      categoryId: 'cat1',
      dayOfMonth: 15,
    };

    it('creates and returns a recurring', async () => {
      categoryAccess.ensureAccess.mockResolvedValue();
      repo.create.mockResolvedValue(makeRecurring() as never);
      const result = await service.create(userId, dto);
      expect(categoryAccess.ensureAccess).toHaveBeenCalledWith('cat1', userId, TransactionType.EXPENSE);
      expect(result).toMatchObject({ id: 'rec1', userId });
    });

    it('throws NotFoundException when category not found', async () => {
      categoryAccess.ensureAccess.mockRejectedValue(new NotFoundException());
      await expect(service.create(userId, dto)).rejects.toThrow(NotFoundException);
    });

    it("throws ForbiddenException when category belongs to another user", async () => {
      categoryAccess.ensureAccess.mockRejectedValue(new ForbiddenException());
      await expect(service.create(userId, dto)).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when category type mismatches', async () => {
      categoryAccess.ensureAccess.mockRejectedValue(new BadRequestException());
      await expect(service.create(userId, dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('throws NotFoundException when not found', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.update(userId, 'rec1', { active: false })).rejects.toThrow(NotFoundException);
    });

    it("throws ForbiddenException for another user's recurring", async () => {
      repo.findById.mockResolvedValue(makeRecurring({ userId: 'other' }) as never);
      await expect(service.update(userId, 'rec1', { active: false })).rejects.toThrow(ForbiddenException);
    });

    it('updates without category validation when categoryId/type unchanged', async () => {
      const updated = makeRecurring({ active: false });
      repo.findById.mockResolvedValue(makeRecurring() as never);
      repo.update.mockResolvedValue(updated as never);
      const result = await service.update(userId, 'rec1', { active: false });
      expect(result.active).toBe(false);
      expect(categoryAccess.ensureAccess).not.toHaveBeenCalled();
    });

    it("throws ForbiddenException when changing to another user's category", async () => {
      repo.findById.mockResolvedValue(makeRecurring() as never);
      categoryAccess.ensureAccess.mockRejectedValue(new ForbiddenException());
      await expect(
        service.update(userId, 'rec1', { categoryId: 'cat2' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when changing to category with mismatched type', async () => {
      repo.findById.mockResolvedValue(makeRecurring() as never);
      categoryAccess.ensureAccess.mockRejectedValue(new BadRequestException());
      await expect(
        service.update(userId, 'rec1', { categoryId: 'cat2' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('throws NotFoundException when not found', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.delete(userId, 'rec1')).rejects.toThrow(NotFoundException);
    });

    it("throws ForbiddenException for another user's recurring", async () => {
      repo.findById.mockResolvedValue(makeRecurring({ userId: 'other' }) as never);
      await expect(service.delete(userId, 'rec1')).rejects.toThrow(ForbiddenException);
    });

    it('deletes successfully', async () => {
      repo.findById.mockResolvedValue(makeRecurring() as never);
      repo.delete.mockResolvedValue(makeRecurring() as never);
      await expect(service.delete(userId, 'rec1')).resolves.toBeUndefined();
    });
  });

  describe('processRecurring', () => {
    it('creates transactions for active recurrings matching today', async () => {
      repo.findActiveByDayOfMonth.mockResolvedValue([makeRecurring()] as never);
      repo.createTransaction.mockResolvedValue({} as never);
      await service.processRecurring();
      expect(repo.createTransaction).toHaveBeenCalledWith({
        amount: 500,
        type: TransactionType.EXPENSE,
        description: 'Netflix',
        categoryId: 'cat1',
        userId,
      });
    });

    it('skips when no active recurrings match', async () => {
      repo.findActiveByDayOfMonth.mockResolvedValue([]);
      await service.processRecurring();
      expect(repo.createTransaction).not.toHaveBeenCalled();
    });

    it('skips recurrings with active: false', async () => {
      repo.findActiveByDayOfMonth.mockResolvedValue([]);
      await service.processRecurring();
      expect(repo.createTransaction).not.toHaveBeenCalled();
    });

    it('does not create transactions when today is Feb 28 and only dayOfMonth=31 exists', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-02-28T00:00:00Z'));
      repo.findActiveByDayOfMonth.mockResolvedValue([]);
      await service.processRecurring();
      expect(repo.findActiveByDayOfMonth).toHaveBeenCalledWith(28);
      expect(repo.createTransaction).not.toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('logs and continues when one createTransaction fails', async () => {
      repo.findActiveByDayOfMonth.mockResolvedValue([
        makeRecurring(),
        makeRecurring({ id: 'rec2', categoryId: 'cat2' }),
      ] as never);
      repo.createTransaction
        .mockRejectedValueOnce(new Error('FK constraint failed'))
        .mockResolvedValueOnce({} as never);

      await expect(service.processRecurring()).resolves.toBeUndefined();
      expect(repo.createTransaction).toHaveBeenCalledTimes(2);
    });

    it('skips creation when a transaction for the same recurring already exists today', async () => {
      repo.findActiveByDayOfMonth.mockResolvedValue([makeRecurring()] as never);
      repo.hasRecurringTransactionToday.mockResolvedValueOnce(true);

      await service.processRecurring();

      expect(repo.createTransaction).not.toHaveBeenCalled();
    });
  });
});
