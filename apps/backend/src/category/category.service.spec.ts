import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TransactionType } from '@finance-tracker/shared';
import { CategoryRepo } from './category.repo';
import { CategoryService } from './category.service';

describe('CategoryService', () => {
  let service: CategoryService;
  let repo: jest.Mocked<CategoryRepo>;

  const userId = 'user1';
  const makeCategory = (overrides: Record<string, unknown> = {}) => ({
    id: 'cat1',
    name: 'Food',
    icon: '🍔',
    type: TransactionType.EXPENSE,
    userId,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: CategoryRepo,
          useValue: {
            findAllForUser: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            hasTransactions: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(CategoryService);
    repo = module.get(CategoryRepo);
  });

  describe('findAll', () => {
    it('returns mapped categories', async () => {
      repo.findAllForUser.mockResolvedValue([makeCategory()] as never);
      const result = await service.findAll(userId, {});
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: 'cat1', name: 'Food' });
    });

    it('passes type filter to repo', async () => {
      repo.findAllForUser.mockResolvedValue([]);
      await service.findAll(userId, { type: TransactionType.INCOME });
      expect(repo.findAllForUser).toHaveBeenCalledWith(userId, TransactionType.INCOME);
    });
  });

  describe('create', () => {
    it('creates and returns a category', async () => {
      repo.create.mockResolvedValue(makeCategory() as never);
      const result = await service.create(userId, {
        name: 'Food',
        icon: '🍔',
        type: TransactionType.EXPENSE,
      });
      expect(result).toMatchObject({ id: 'cat1', userId });
    });
  });

  describe('update', () => {
    it('throws NotFoundException when category not found', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.update(userId, 'cat1', { name: 'New' })).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for seed default (userId=null)', async () => {
      repo.findById.mockResolvedValue(makeCategory({ userId: null }) as never);
      await expect(service.update(userId, 'cat1', { name: 'New' })).rejects.toThrow(ForbiddenException);
    });

    it("throws ForbiddenException for another user's category", async () => {
      repo.findById.mockResolvedValue(makeCategory({ userId: 'other' }) as never);
      await expect(service.update(userId, 'cat1', { name: 'New' })).rejects.toThrow(ForbiddenException);
    });

    it('updates and returns the category', async () => {
      const updated = makeCategory({ name: 'New' });
      repo.findById.mockResolvedValue(makeCategory() as never);
      repo.update.mockResolvedValue(updated as never);
      const result = await service.update(userId, 'cat1', { name: 'New' });
      expect(result.name).toBe('New');
    });
  });

  describe('delete', () => {
    it('throws NotFoundException when category not found', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.delete(userId, 'cat1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for seed default', async () => {
      repo.findById.mockResolvedValue(makeCategory({ userId: null }) as never);
      await expect(service.delete(userId, 'cat1')).rejects.toThrow(ForbiddenException);
    });

    it("throws ForbiddenException for another user's category", async () => {
      repo.findById.mockResolvedValue(makeCategory({ userId: 'other' }) as never);
      await expect(service.delete(userId, 'cat1')).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException when category has transactions', async () => {
      repo.findById.mockResolvedValue(makeCategory() as never);
      repo.hasTransactions.mockResolvedValue(true);
      await expect(service.delete(userId, 'cat1')).rejects.toThrow(ConflictException);
    });

    it('deletes category successfully', async () => {
      repo.findById.mockResolvedValue(makeCategory() as never);
      repo.hasTransactions.mockResolvedValue(false);
      repo.delete.mockResolvedValue(makeCategory() as never);
      await expect(service.delete(userId, 'cat1')).resolves.toBeUndefined();
    });
  });
});
