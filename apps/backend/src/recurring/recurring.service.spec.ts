import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TransactionType } from '@finance-tracker/shared';
import { RecurringRepo } from './recurring.repo';
import { RecurringService } from './recurring.service';

describe('RecurringService', () => {
  let service: RecurringService;
  let repo: jest.Mocked<RecurringRepo>;

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
          },
        },
      ],
    }).compile();

    service = module.get(RecurringService);
    repo = module.get(RecurringRepo);
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
    it('creates and returns a recurring', async () => {
      repo.create.mockResolvedValue(makeRecurring() as never);
      const result = await service.create(userId, {
        amount: 500,
        type: TransactionType.EXPENSE,
        description: 'Netflix',
        categoryId: 'cat1',
        dayOfMonth: 15,
      });
      expect(result).toMatchObject({ id: 'rec1', userId });
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

    it('updates and returns the recurring', async () => {
      const updated = makeRecurring({ active: false });
      repo.findById.mockResolvedValue(makeRecurring() as never);
      repo.update.mockResolvedValue(updated as never);
      const result = await service.update(userId, 'rec1', { active: false });
      expect(result.active).toBe(false);
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
  });
});
