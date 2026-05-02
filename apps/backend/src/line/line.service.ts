import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Category } from '@finance-tracker/database';
import { CategoryResponse, TransactionType } from '@finance-tracker/shared';
import { messagingApi, webhook } from '@line/bot-sdk';
import { CategoryRepo } from '../category/category.repo';
import { AutoCategorizerService } from './categorizer/auto-categorizer.service';
import { LineRepo } from './line.repo';
import { parseThaiMessage } from './parsers/thai-message.parser';

@Injectable()
export class LineService {
  private readonly logger = new Logger(LineService.name);
  private readonly client: messagingApi.MessagingApiClient;

  constructor(
    private readonly config: ConfigService,
    private readonly lineRepo: LineRepo,
    private readonly categoryRepo: CategoryRepo,
    private readonly categorizer: AutoCategorizerService,
  ) {
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

    const lineUserId = event.source?.userId;
    if (!lineUserId) return;

    const replyToken = messageEvent.replyToken;
    if (!replyToken) return;

    const textMessage = messageEvent.message as webhook.TextMessageContent;
    const text = textMessage.text.trim();

    const user = await this.lineRepo.findOrCreateByLineUserId(lineUserId);
    const replyText = await this.buildReply(text, user.id);

    await this.client.replyMessage({
      replyToken,
      messages: [{ type: 'text', text: replyText }],
    });
  }

  private async buildReply(text: string, userId: string): Promise<string> {
    const parsed = parseThaiMessage(text);
    if (parsed) {
      const cats = await this.categoryRepo.findAllForUser(userId);
      const category = await this.categorizer.categorize(
        parsed.description,
        parsed.type,
        cats.map((c) => this.toResponse(c)),
      );
      await this.lineRepo.createTransaction({
        amount: parsed.amount,
        type: parsed.type,
        description: parsed.description,
        categoryId: category.id,
        userId,
      });
      return `บันทึกแล้ว: ${parsed.description} ${this.formatAmount(parsed.amount)} บาท (${category.name})`;
    }

    if (text === 'สรุป') {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const { income, expense } = await this.lineRepo.sumByPeriod(userId, start, end);
      return `สรุปวันนี้\nรายรับ: ${this.formatAmount(income)} บาท\nรายจ่าย: ${this.formatAmount(expense)} บาท`;
    }

    if (text === 'เดือนนี้') {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const { income, expense } = await this.lineRepo.sumByPeriod(userId, start, end);
      return `สรุปเดือนนี้\nรายรับ: ${this.formatAmount(income)} บาท\nรายจ่าย: ${this.formatAmount(expense)} บาท`;
    }

    if (text === 'ยกเลิก') {
      const last = await this.lineRepo.findLastTransaction(userId);
      if (!last) return 'ไม่มีรายการล่าสุด';
      await this.lineRepo.deleteTransaction(last.id);
      const desc = last.description ? `${last.description} ` : '';
      return `ยกเลิกรายการล่าสุดแล้ว: ${desc}${this.formatAmount(Number(last.amount))} บาท`;
    }

    return 'วิธีใช้:\n• บันทึก: กาแฟ 65\n• สรุป - ยอดวันนี้\n• เดือนนี้ - ยอดเดือนนี้\n• ยกเลิก - ลบรายการล่าสุด';
  }

  private toResponse(c: Category): CategoryResponse {
    return {
      id: c.id,
      name: c.name,
      icon: c.icon,
      type: c.type as TransactionType,
      userId: c.userId,
      createdAt: c.createdAt,
    };
  }

  private formatAmount(n: number): string {
    return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
}
