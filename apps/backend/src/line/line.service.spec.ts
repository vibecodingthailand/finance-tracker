import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { User, Transaction, LinkCode } from '@finance-tracker/database';
import { Category } from '@finance-tracker/database';
import { TransactionType } from '@finance-tracker/shared';
import { webhook } from '@line/bot-sdk';
import { CategoryRepo } from '../category/category.repo';
import { LinkRepo } from '../link/link.repo';
import { AutoCategorizerService } from './categorizer/auto-categorizer.service';
import { LineRepo } from './line.repo';
import { LineService } from './line.service';

const MOCK_USER = { id: 'user-1', lineUserId: 'U123' } as User;

const makeCategory = (id: string, name: string): Category =>
  ({
    id,
    name,
    icon: '📦',
    type: 'EXPENSE',
    userId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as unknown as Category;

const makeTextEvent = (text: string, userId: string = 'U123'): webhook.MessageEvent => ({
  type: 'message',
  replyToken: 'reply-token',
  message: { type: 'text', id: 'msg1', text } as webhook.TextMessageContent,
  source: { type: 'user', userId },
  timestamp: Date.now(),
  mode: 'active',
  webhookEventId: 'evt1',
  deliveryContext: { isRedelivery: false },
});

const flush = () => new Promise<void>((r) => setTimeout(r, 10));

describe('LineService', () => {
  let service: LineService;
  let lineRepo: jest.Mocked<LineRepo>;
  let categoryRepo: jest.Mocked<CategoryRepo>;
  let categorizer: jest.Mocked<AutoCategorizerService>;
  let linkRepo: jest.Mocked<LinkRepo>;
  let replySpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LineService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => {
              if (key === 'LINE_CHANNEL_ACCESS_TOKEN') return 'test-token';
              throw new Error(`Missing env: ${key}`);
            },
          },
        },
        {
          provide: LineRepo,
          useValue: {
            findOrCreateByLineUserId: jest.fn(),
            createTransaction: jest.fn(),
            findLastTransaction: jest.fn(),
            deleteTransaction: jest.fn(),
            sumByPeriod: jest.fn(),
            mergeLineUserIntoWebUser: jest.fn(),
          },
        },
        {
          provide: CategoryRepo,
          useValue: { findAllForUser: jest.fn() },
        },
        {
          provide: AutoCategorizerService,
          useValue: { categorize: jest.fn() },
        },
        {
          provide: LinkRepo,
          useValue: {
            findValid: jest.fn(),
            markUsed: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(LineService);
    lineRepo = module.get(LineRepo);
    categoryRepo = module.get(CategoryRepo);
    categorizer = module.get(AutoCategorizerService);
    linkRepo = module.get(LinkRepo);
    replySpy = jest
      .spyOn(service['client'], 'replyMessage')
      .mockResolvedValue({} as never);
  });

  afterEach(() => jest.clearAllMocks());

  describe('handleWebhook', () => {
    it('returns void without blocking the caller', () => {
      expect(() =>
        service.handleWebhook({ destination: 'U', events: [] }),
      ).not.toThrow();
    });
  });

  describe('event filtering', () => {
    it('ignores non-message events', async () => {
      const event = {
        type: 'follow',
        source: { type: 'user', userId: 'U123' },
        timestamp: Date.now(),
        mode: 'active',
        webhookEventId: 'evt1',
        deliveryContext: { isRedelivery: false },
      } as unknown as webhook.Event;

      service.handleWebhook({ destination: 'U', events: [event] });
      await flush();

      expect(lineRepo.findOrCreateByLineUserId).not.toHaveBeenCalled();
    });

    it('ignores non-text message events', async () => {
      const event: webhook.MessageEvent = {
        type: 'message',
        replyToken: 'token',
        message: { type: 'image', id: 'img1' } as webhook.ImageMessageContent,
        source: { type: 'user', userId: 'U123' },
        timestamp: Date.now(),
        mode: 'active',
        webhookEventId: 'evt1',
        deliveryContext: { isRedelivery: false },
      };

      service.handleWebhook({ destination: 'U', events: [event] });
      await flush();

      expect(lineRepo.findOrCreateByLineUserId).not.toHaveBeenCalled();
    });

    it('ignores text events without a source userId', async () => {
      const event: webhook.MessageEvent = {
        ...makeTextEvent('กาแฟ 65'),
        source: { type: 'room', roomId: 'R1', userId: undefined },
      };

      service.handleWebhook({ destination: 'U', events: [event] });
      await flush();

      expect(lineRepo.findOrCreateByLineUserId).not.toHaveBeenCalled();
    });
  });

  describe('transaction recording', () => {
    beforeEach(() => {
      lineRepo.findOrCreateByLineUserId.mockResolvedValue(MOCK_USER);
      lineRepo.createTransaction.mockResolvedValue({} as Transaction);
    });

    it('saves the transaction and replies with a confirmation', async () => {
      const cat = makeCategory('cat-food', 'อาหาร');
      categoryRepo.findAllForUser.mockResolvedValue([cat]);
      categorizer.categorize.mockResolvedValue({
        id: 'cat-food',
        name: 'อาหาร',
        icon: '📦',
        type: TransactionType.EXPENSE,
        userId: null,
        createdAt: new Date(),
      });

      service.handleWebhook({ destination: 'U', events: [makeTextEvent('กาแฟ 65')] });
      await flush();

      expect(lineRepo.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 65, description: 'กาแฟ', userId: 'user-1' }),
      );
      expect(replySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ type: 'text', text: 'บันทึกแล้ว: กาแฟ 65 บาท (อาหาร)' }],
        }),
      );
    });

    it('formats comma-separated amounts correctly', async () => {
      categoryRepo.findAllForUser.mockResolvedValue([makeCategory('cat-rent', 'ค่าเช่า')]);
      categorizer.categorize.mockResolvedValue({
        id: 'cat-rent',
        name: 'ค่าเช่า',
        icon: '🏠',
        type: TransactionType.EXPENSE,
        userId: null,
        createdAt: new Date(),
      });

      service.handleWebhook({ destination: 'U', events: [makeTextEvent('ค่าเช่า 8,500')] });
      await flush();

      expect(replySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ type: 'text', text: 'บันทึกแล้ว: ค่าเช่า 8,500 บาท (ค่าเช่า)' }],
        }),
      );
    });
  });

  describe('สรุป command', () => {
    it('replies with today income and expense totals', async () => {
      lineRepo.findOrCreateByLineUserId.mockResolvedValue(MOCK_USER);
      lineRepo.sumByPeriod.mockResolvedValue({ income: 45000, expense: 1250 });

      service.handleWebhook({ destination: 'U', events: [makeTextEvent('สรุป')] });
      await flush();

      const replyText: string = replySpy.mock.calls[0]?.[0]?.messages?.[0]?.text ?? '';
      expect(replyText).toContain('สรุปวันนี้');
      expect(replyText).toContain('45,000');
      expect(replyText).toContain('1,250');
    });
  });

  describe('เดือนนี้ command', () => {
    it('replies with this month income and expense totals', async () => {
      lineRepo.findOrCreateByLineUserId.mockResolvedValue(MOCK_USER);
      lineRepo.sumByPeriod.mockResolvedValue({ income: 50000, expense: 20000 });

      service.handleWebhook({ destination: 'U', events: [makeTextEvent('เดือนนี้')] });
      await flush();

      const replyText: string = replySpy.mock.calls[0]?.[0]?.messages?.[0]?.text ?? '';
      expect(replyText).toContain('สรุปเดือนนี้');
    });
  });

  describe('ยกเลิก command', () => {
    beforeEach(() => {
      lineRepo.findOrCreateByLineUserId.mockResolvedValue(MOCK_USER);
    });

    it('deletes the last transaction and confirms', async () => {
      const lastTx = {
        id: 'tx-1',
        description: 'กาแฟ',
        amount: { valueOf: () => 65 } as unknown,
      } as unknown as Transaction;
      lineRepo.findLastTransaction.mockResolvedValue(lastTx);
      lineRepo.deleteTransaction.mockResolvedValue(lastTx);

      service.handleWebhook({ destination: 'U', events: [makeTextEvent('ยกเลิก')] });
      await flush();

      expect(lineRepo.deleteTransaction).toHaveBeenCalledWith('tx-1');
      const replyText: string = replySpy.mock.calls[0]?.[0]?.messages?.[0]?.text ?? '';
      expect(replyText).toContain('ยกเลิกรายการล่าสุดแล้ว');
    });

    it('replies ไม่มีรายการล่าสุด when no transactions exist', async () => {
      lineRepo.findLastTransaction.mockResolvedValue(null);

      service.handleWebhook({ destination: 'U', events: [makeTextEvent('ยกเลิก')] });
      await flush();

      expect(replySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ type: 'text', text: 'ไม่มีรายการล่าสุด' }],
        }),
      );
    });
  });

  describe('เชื่อม command', () => {
    beforeEach(() => {
      lineRepo.findOrCreateByLineUserId.mockResolvedValue(MOCK_USER);
    });

    it('merges LINE user into web user on valid code', async () => {
      const linkCode = { id: 'lc-1', userId: 'web-user-1' } as LinkCode;
      linkRepo.findValid.mockResolvedValue(linkCode);
      lineRepo.mergeLineUserIntoWebUser.mockResolvedValue();
      linkRepo.markUsed.mockResolvedValue(linkCode);

      service.handleWebhook({ destination: 'U', events: [makeTextEvent('เชื่อม 123456')] });
      await flush();

      expect(lineRepo.mergeLineUserIntoWebUser).toHaveBeenCalledWith('user-1', 'U123', 'web-user-1');
      expect(linkRepo.markUsed).toHaveBeenCalledWith('lc-1');
      expect(replySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ type: 'text', text: 'เชื่อมเรียบร้อย! บัญชี LINE ของคุณเชื่อมกับเว็บแล้ว' }],
        }),
      );
    });

    it('replies with error when code is invalid or expired', async () => {
      linkRepo.findValid.mockResolvedValue(null);

      service.handleWebhook({ destination: 'U', events: [makeTextEvent('เชื่อม 000000')] });
      await flush();

      expect(replySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ type: 'text', text: 'code ไม่ถูกต้องหรือหมดอายุแล้ว' }],
        }),
      );
    });

    it('replies already linked when code belongs to the same user', async () => {
      const linkCode = { id: 'lc-1', userId: 'user-1' } as LinkCode;
      linkRepo.findValid.mockResolvedValue(linkCode);

      service.handleWebhook({ destination: 'U', events: [makeTextEvent('เชื่อม 123456')] });
      await flush();

      expect(lineRepo.mergeLineUserIntoWebUser).not.toHaveBeenCalled();
      expect(replySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ type: 'text', text: 'บัญชีนี้เชื่อมแล้ว' }],
        }),
      );
    });
  });

  describe('help fallback', () => {
    it('replies with usage instructions for unrecognised text', async () => {
      lineRepo.findOrCreateByLineUserId.mockResolvedValue(MOCK_USER);

      service.handleWebhook({ destination: 'U', events: [makeTextEvent('ไม่รู้จัก')] });
      await flush();

      const replyText: string = replySpy.mock.calls[0]?.[0]?.messages?.[0]?.text ?? '';
      expect(replyText).toContain('วิธีใช้');
    });
  });
});
