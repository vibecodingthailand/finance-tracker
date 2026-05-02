import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { messagingApi, webhook } from '@line/bot-sdk';

@Injectable()
export class LineService {
  private readonly logger = new Logger(LineService.name);
  private readonly client: messagingApi.MessagingApiClient;

  constructor(private readonly config: ConfigService) {
    this.client = new messagingApi.MessagingApiClient({
      channelAccessToken: this.config.getOrThrow<string>('LINE_CHANNEL_ACCESS_TOKEN'),
    });
  }

  handleWebhook(body: webhook.CallbackRequest): void {
    this.processEvents(body.events).catch((err: unknown) =>
      this.logger.error('Failed to process LINE events', err),
    );
  }

  private async processEvents(events: webhook.Event[]): Promise<void> {
    for (const event of events) {
      await this.handleEvent(event);
    }
  }

  private async handleEvent(event: webhook.Event): Promise<void> {
    if (event.type !== 'message') return;

    const messageEvent = event as webhook.MessageEvent;
    if (messageEvent.message.type !== 'text') return;

    const textMessage = messageEvent.message as webhook.TextMessageContent;
    this.logger.log(`Message from ${event.source?.userId ?? 'unknown'}: ${textMessage.text}`);
  }
}
