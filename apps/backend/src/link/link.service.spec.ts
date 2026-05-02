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
          useValue: { create: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(LinkService);
    repo = module.get(LinkRepo);
    repo.create.mockResolvedValue({} as LinkCode);
  });

  afterEach(() => jest.clearAllMocks());

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
});
