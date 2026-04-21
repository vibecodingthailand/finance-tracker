import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { messagingApi, webhook } from "@line/bot-sdk";

@Injectable()
export class LineService {
  private readonly logger = new Logger(LineService.name);
  private readonly client: messagingApi.MessagingApiClient;

  constructor(config: ConfigService) {
    const channelAccessToken = config.getOrThrow<string>(
      "LINE_CHANNEL_ACCESS_TOKEN",
    );
    this.client = new messagingApi.MessagingApiClient({ channelAccessToken });
  }

  processEvents(events: webhook.Event[]): void {
    for (const event of events) {
      this.handleEvent(event).catch((err: unknown) => {
        this.logger.error(
          `Failed to handle LINE event type=${event.type}`,
          err instanceof Error ? err.stack : String(err),
        );
      });
    }
  }

  private async handleEvent(event: webhook.Event): Promise<void> {
    if (event.type !== "message") {
      return;
    }
    if (event.message.type !== "text") {
      return;
    }
    const replyToken = event.replyToken;
    if (!replyToken) {
      return;
    }

    await this.client.replyMessage({
      replyToken,
      messages: [
        {
          type: "text",
          text: `ได้รับข้อความ: ${event.message.text}`,
        },
      ],
    });
  }
}
