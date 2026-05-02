import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { webhook } from '@line/bot-sdk';
import { LineService } from './line.service';

describe('LineService', () => {
  let service: LineService;

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
      ],
    }).compile();

    service = module.get(LineService);
  });

  it('processes events without blocking the caller', () => {
    const body: webhook.CallbackRequest = {
      destination: 'Utest',
      events: [],
    };

    expect(() => service.handleWebhook(body)).not.toThrow();
  });

  it('handles text message events without throwing', async () => {
    const textEvent: webhook.MessageEvent = {
      type: 'message',
      replyToken: 'token',
      message: {
        type: 'text',
        id: 'msg1',
        text: '100 coffee',
      } as webhook.TextMessageContent,
      source: { type: 'user', userId: 'U123' },
      timestamp: Date.now(),
      mode: 'active',
      webhookEventId: 'evt1',
      deliveryContext: { isRedelivery: false },
    };

    const body: webhook.CallbackRequest = {
      destination: 'Utest',
      events: [textEvent],
    };

    service.handleWebhook(body);
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
});
