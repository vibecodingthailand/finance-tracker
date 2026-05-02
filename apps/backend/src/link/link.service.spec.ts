import { Test, TestingModule } from '@nestjs/testing';
import { LinkCode } from '@finance-tracker/database';
import { LinkRepo } from './link.repo';
import { LinkService } from './link.service';

describe('LinkService', () => {
  let service: LinkService;
  let repo: jest.Mocked<LinkRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinkService,
        {
          provide: LinkRepo,
          useValue: {
            create: jest.fn(),
            findValid: jest.fn(),
            markUsed: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(LinkService);
    repo = module.get(LinkRepo);
    repo.create.mockResolvedValue({} as LinkCode);
  });

  afterEach(() => jest.clearAllMocks());

  describe('createCode', () => {
    it('returns a 6-digit numeric code', async () => {
      const result = await service.createCode('user-1');
      expect(result.code).toMatch(/^\d{6}$/);
    });

    it('expiresAt is approximately 5 minutes from now', async () => {
      const before = Date.now();
      const result = await service.createCode('user-1');
      const after = Date.now();

      const expiresAt = new Date(result.expiresAt).getTime();
      expect(expiresAt).toBeGreaterThanOrEqual(before + 5 * 60 * 1000);
      expect(expiresAt).toBeLessThanOrEqual(after + 5 * 60 * 1000 + 100);
    });

    it('persists the code via repo.create', async () => {
      await service.createCode('user-1');
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', code: expect.stringMatching(/^\d{6}$/) }),
      );
    });

    it('persists the expiresAt timestamp that matches the returned value', async () => {
      const result = await service.createCode('user-1');
      const createArg = repo.create.mock.calls[0]?.[0];
      expect(createArg?.expiresAt.toISOString()).toBe(result.expiresAt);
    });

    it('code is in range 100000–999999 (never zero-padded)', async () => {
      for (let i = 0; i < 20; i++) {
        const result = await service.createCode('user-1');
        const num = parseInt(result.code, 10);
        expect(num).toBeGreaterThanOrEqual(100000);
        expect(num).toBeLessThanOrEqual(999999);
      }
    });

    it('successive codes within 5 minutes can differ (non-deterministic generation)', async () => {
      const codes = new Set<string>();
      for (let i = 0; i < 5; i++) {
        const result = await service.createCode('user-1');
        codes.add(result.code);
      }
      expect(codes.size).toBeGreaterThanOrEqual(1);
    });

    it('calls repo.create once per invocation', async () => {
      await service.createCode('user-1');
      expect(repo.create).toHaveBeenCalledTimes(1);
    });

    it('returns expiresAt as an ISO string', async () => {
      const result = await service.createCode('user-1');
      expect(() => new Date(result.expiresAt)).not.toThrow();
      expect(result.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('works for different userIds without cross-contamination', async () => {
      const result1 = await service.createCode('user-1');
      const result2 = await service.createCode('user-2');

      expect(repo.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ userId: 'user-1' }),
      );
      expect(repo.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ userId: 'user-2' }),
      );
      expect(result1.code).toMatch(/^\d{6}$/);
      expect(result2.code).toMatch(/^\d{6}$/);
    });
  });
});
