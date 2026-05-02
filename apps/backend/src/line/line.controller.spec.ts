import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { validateSignature } from '@line/bot-sdk';
import { webhook } from '@line/bot-sdk';
import { LineController } from './line.controller';
import { LineSignatureGuard } from './line-signature.guard';
import { LineService } from './line.service';

jest.mock('@line/bot-sdk', () => {
  const actual = jest.requireActual<typeof import('@line/bot-sdk')>('@line/bot-sdk');
  return {
    ...actual,
    validateSignature: jest.fn(),
  };
});

const mockValidateSignature = validateSignature as jest.MockedFunction<typeof validateSignature>;

const LINE_SIGNATURE_HEADER = 'x-line-signature';

function makeExecutionContext(overrides: {
  headers?: Record<string, string | undefined>;
  rawBody?: Buffer | null;
}): ExecutionContext {
  const req = {
    headers: overrides.headers ?? { [LINE_SIGNATURE_HEADER]: 'valid-sig' },
    rawBody: overrides.rawBody !== undefined ? overrides.rawBody : Buffer.from('{"events":[]}'),
  };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

describe('LineSignatureGuard', () => {
  let guard: LineSignatureGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LineSignatureGuard,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => {
              if (key === 'LINE_CHANNEL_SECRET') return 'channel-secret';
              throw new Error(`Unexpected config key: ${key}`);
            },
          },
        },
      ],
    }).compile();

    guard = module.get(LineSignatureGuard);
  });

  afterEach(() => jest.clearAllMocks());

  describe('canActivate', () => {
    it('returns true when signature is valid', () => {
      mockValidateSignature.mockReturnValue(true);
      const ctx = makeExecutionContext({});

      const result = guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(mockValidateSignature).toHaveBeenCalledWith(
        expect.any(Buffer),
        'channel-secret',
        'valid-sig',
      );
    });

    it('throws UnauthorizedException when signature validation fails', () => {
      mockValidateSignature.mockReturnValue(false);
      const ctx = makeExecutionContext({});

      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when signature header is missing', () => {
      const ctx = makeExecutionContext({ headers: { [LINE_SIGNATURE_HEADER]: undefined } });

      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
      expect(mockValidateSignature).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when rawBody is missing', () => {
      const ctx = makeExecutionContext({
        headers: { [LINE_SIGNATURE_HEADER]: 'some-sig' },
        rawBody: null,
      });

      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
      expect(mockValidateSignature).not.toHaveBeenCalled();
    });
  });
});

describe('LineController', () => {
  let controller: LineController;
  let lineService: jest.Mocked<LineService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LineController],
      providers: [
        {
          provide: LineService,
          useValue: { handleWebhook: jest.fn() },
        },
      ],
    })
      .overrideGuard(LineSignatureGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(LineController);
    lineService = module.get(LineService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('webhook', () => {
    it('calls lineService.handleWebhook with the request body and returns void', () => {
      const body: webhook.CallbackRequest = {
        destination: 'U123',
        events: [
          {
            type: 'message',
            replyToken: 'reply-token',
            message: { type: 'text', id: 'msg1', text: 'กาแฟ 65' } as webhook.TextMessageContent,
            source: { type: 'user', userId: 'U123' },
            timestamp: Date.now(),
            mode: 'active',
            webhookEventId: 'evt1',
            deliveryContext: { isRedelivery: false },
          } as webhook.MessageEvent,
        ],
      };

      const result = controller.webhook(body);

      expect(lineService.handleWebhook).toHaveBeenCalledWith(body);
      expect(result).toBeUndefined();
    });

    it('handles a webhook verify ping (empty events array) without throwing', () => {
      const body: webhook.CallbackRequest = { destination: 'U123', events: [] };

      expect(() => controller.webhook(body)).not.toThrow();
      expect(lineService.handleWebhook).toHaveBeenCalledWith(body);
    });

    it('handles a body with no events key gracefully', () => {
      const body = { destination: 'U123' } as webhook.CallbackRequest;

      expect(() => controller.webhook(body)).not.toThrow();
      expect(lineService.handleWebhook).toHaveBeenCalledWith(body);
    });
  });
});
