import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TransactionType } from '@finance-tracker/shared';
import type { CategoryResponse } from '@finance-tracker/shared';
import { AutoCategorizerService } from './auto-categorizer.service';

const makeCategory = (
  id: string,
  name: string,
  type: TransactionType = TransactionType.EXPENSE,
): CategoryResponse => ({
  id,
  name,
  icon: '📦',
  type,
  userId: null,
  createdAt: new Date(),
});

const EXPENSE_CATEGORIES: CategoryResponse[] = [
  makeCategory('cat-food', 'อาหาร'),
  makeCategory('cat-transport', 'ค่าเดินทาง'),
  makeCategory('cat-other', 'อื่นๆ'),
];

const INCOME_CATEGORIES: CategoryResponse[] = [
  makeCategory('cat-salary', 'เงินเดือน', TransactionType.INCOME),
  makeCategory('cat-income-other', 'อื่นๆ', TransactionType.INCOME),
];

const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

const jsonResponse = (id: string) => ({ content: [{ type: 'text', text: `{"id":"${id}"}` }] });

describe('AutoCategorizerService', () => {
  let service: AutoCategorizerService;
  let createSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutoCategorizerService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => {
              if (key === 'ANTHROPIC_API_KEY') return 'test-key';
              throw new Error(`Unexpected config key: ${key}`);
            },
          },
        },
      ],
    }).compile();

    service = module.get(AutoCategorizerService);
    createSpy = jest.spyOn(service['anthropic'].messages, 'create');
  });

  afterEach(() => jest.clearAllMocks());

  describe('successful categorization', () => {
    it('returns the category Haiku picked', async () => {
      createSpy.mockResolvedValueOnce(jsonResponse('cat-food') as never);

      const result = await service.categorize('กาแฟ', TransactionType.EXPENSE, EXPENSE_CATEGORIES);
      expect(result.id).toBe('cat-food');
    });

    it('passes only categories matching the requested type to Haiku', async () => {
      createSpy.mockResolvedValueOnce(jsonResponse('cat-food') as never);

      await service.categorize('กาแฟ', TransactionType.EXPENSE, ALL_CATEGORIES);

      const call = createSpy.mock.calls[0] as [{ messages: Array<{ content: string }> }];
      const prompt = call[0].messages[0]?.content ?? '';
      expect(prompt).not.toContain('cat-salary');
      expect(prompt).toContain('cat-food');
    });

    it('parses JSON response and extracts id', async () => {
      createSpy.mockResolvedValueOnce({
        content: [{ type: 'text', text: '  {"id":"cat-food"}  \n' }],
      } as never);

      const result = await service.categorize('ข้าว', TransactionType.EXPENSE, EXPENSE_CATEGORIES);
      expect(result.id).toBe('cat-food');
    });

    it('handles markdown-wrapped JSON response', async () => {
      createSpy.mockResolvedValueOnce({
        content: [{ type: 'text', text: '```json\n{"id":"cat-food"}\n```' }],
      } as never);

      const result = await service.categorize('ข้าว', TransactionType.EXPENSE, EXPENSE_CATEGORIES);
      expect(result.id).toBe('cat-food');
    });
  });

  describe('caching', () => {
    it('returns cached result and does not call Haiku again', async () => {
      createSpy.mockResolvedValue(jsonResponse('cat-food') as never);

      await service.categorize('กาแฟ', TransactionType.EXPENSE, EXPENSE_CATEGORIES);
      await service.categorize('กาแฟ', TransactionType.EXPENSE, EXPENSE_CATEGORIES);

      expect(createSpy).toHaveBeenCalledTimes(1);
    });

    it('treats description as case-insensitive for cache key', async () => {
      createSpy.mockResolvedValue(jsonResponse('cat-food') as never);

      await service.categorize('กาแฟ', TransactionType.EXPENSE, EXPENSE_CATEGORIES);
      await service.categorize('กาแฟ', TransactionType.EXPENSE, EXPENSE_CATEGORIES);

      expect(createSpy).toHaveBeenCalledTimes(1);
    });

    it('does not reuse cache across different types', async () => {
      createSpy
        .mockResolvedValueOnce(jsonResponse('cat-food') as never)
        .mockResolvedValueOnce(jsonResponse('cat-salary') as never);

      await service.categorize('โบนัส', TransactionType.EXPENSE, ALL_CATEGORIES);
      await service.categorize('โบนัส', TransactionType.INCOME, ALL_CATEGORIES);

      expect(createSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('fallback behaviour', () => {
    it('falls back to อื่นๆ when Haiku returns an unrecognised ID', async () => {
      createSpy.mockResolvedValueOnce(jsonResponse('cat-does-not-exist') as never);

      const result = await service.categorize('กาแฟ', TransactionType.EXPENSE, EXPENSE_CATEGORIES);
      expect(result.id).toBe('cat-other');
    });

    it('falls back to อื่นๆ when Haiku API throws', async () => {
      createSpy.mockRejectedValueOnce(new Error('API error'));

      const result = await service.categorize('กาแฟ', TransactionType.EXPENSE, EXPENSE_CATEGORIES);
      expect(result.id).toBe('cat-other');
    });

    it('falls back to first category when no อื่นๆ exists', async () => {
      createSpy.mockRejectedValueOnce(new Error('API error'));

      const noOtherCategories: CategoryResponse[] = [makeCategory('cat-food', 'อาหาร')];
      const result = await service.categorize('กาแฟ', TransactionType.EXPENSE, noOtherCategories);
      expect(result.id).toBe('cat-food');
    });

    it('throws when no categories exist for the requested type', async () => {
      await expect(
        service.categorize('กาแฟ', TransactionType.INCOME, EXPENSE_CATEGORIES),
      ).rejects.toThrow();
    });
  });
});
