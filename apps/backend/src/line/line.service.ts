import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { messagingApi, webhook } from '@line/bot-sdk';
import { toCategoryResponse } from '../category/category.mapper';
import { CategoryRepo } from '../category/category.repo';
import { LinkRepo } from '../link/link.repo';
import { AutoCategorizerService } from './categorizer/auto-categorizer.service';
import { LineRepo } from './line.repo';
import { parseThaiMessage } from './parsers/thai-message.parser';

const LINK_PATTERN = /^เชื่อม\s+(\d{6})$/;
const HELP_TEXT =
  'วิธีใช้:\n• บันทึก: กาแฟ 65\n• สรุป - ยอดวันนี้\n• เดือนนี้ - ยอดเดือนนี้\n• ยกเลิก - ลบรายการล่าสุด';

@Injectable()
export class LineService {
  private readonly client: messagingApi.MessagingApiClient;

  constructor(
    private readonly config: ConfigService,
    private readonly lineRepo: LineRepo,
    private readonly categoryRepo: CategoryRepo,
    private readonly categorizer: AutoCategorizerService,
    private readonly linkRepo: LinkRepo,
  ) {
    this.client = new messagingApi.MessagingApiClient({
      channelAccessToken: this.config.getOrThrow<string>('LINE_CHANNEL_ACCESS_TOKEN'),
    });
  }

  async handleWebhook(body: webhook.CallbackRequest): Promise<void> {
    for (const event of body.events) {
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
    const replyText = await this.buildReply(text, user.id, lineUserId);

    await this.client.replyMessage({
      replyToken,
      messages: [{ type: 'text', text: replyText }],
    });
  }

  private async buildReply(text: string, userId: string, lineUserId: string): Promise<string> {
    return (
      (await this.handleLinkCommand(text, userId, lineUserId)) ??
      (await this.handleRecordCommand(text, userId)) ??
      (await this.handleDailySummary(text, userId)) ??
      (await this.handleMonthlySummary(text, userId)) ??
      (await this.handleUndo(text, userId)) ??
      HELP_TEXT
    );
  }

  private async handleLinkCommand(
    text: string,
    userId: string,
    lineUserId: string,
  ): Promise<string | null> {
    const match = text.match(LINK_PATTERN);
    if (!match) return null;

    const code = match[1]!;
    const linkCode = await this.linkRepo.findValid(code);
    if (!linkCode) return 'code ไม่ถูกต้องหรือหมดอายุแล้ว';
    if (linkCode.userId === userId) return 'บัญชีนี้เชื่อมแล้ว';

    await this.lineRepo.mergeLineUserIntoWebUser(userId, lineUserId, linkCode.userId);
    await this.linkRepo.markUsed(linkCode.id);
    return 'เชื่อมเรียบร้อย! บัญชี LINE ของคุณเชื่อมกับเว็บแล้ว';
  }

  private async handleRecordCommand(text: string, userId: string): Promise<string | null> {
    const parsed = parseThaiMessage(text);
    if (!parsed) return null;

    const cats = await this.categoryRepo.findAllForUser(userId);
    const category = await this.categorizer.categorize(
      parsed.description,
      parsed.type,
      cats.map(toCategoryResponse),
      userId,
    );
    await this.lineRepo.createTransaction({
      amount: parsed.amount,
      type: parsed.type,
      description: parsed.description,
      categoryId: category.id,
      userId,
    });
    return `บันทึกแล้ว: ${parsed.description} ${formatAmount(parsed.amount)} บาท (${category.name})`;
  }

  private async handleDailySummary(text: string, userId: string): Promise<string | null> {
    if (text !== 'สรุป') return null;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return this.formatPeriodSummary('สรุปวันนี้', userId, start, end);
  }

  private async handleMonthlySummary(text: string, userId: string): Promise<string | null> {
    if (text !== 'เดือนนี้') return null;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return this.formatPeriodSummary('สรุปเดือนนี้', userId, start, end);
  }

  private async handleUndo(text: string, userId: string): Promise<string | null> {
    if (text !== 'ยกเลิก') return null;
    const last = await this.lineRepo.findLastTransaction(userId);
    if (!last) return 'ไม่มีรายการล่าสุด';
    await this.lineRepo.deleteTransaction(last.id);
    const desc = last.description ? `${last.description} ` : '';
    return `ยกเลิกรายการล่าสุดแล้ว: ${desc}${formatAmount(Number(last.amount))} บาท`;
  }

  private async formatPeriodSummary(
    label: string,
    userId: string,
    start: Date,
    end: Date,
  ): Promise<string> {
    const { income, expense } = await this.lineRepo.sumByPeriod(userId, start, end);
    return `${label}\nรายรับ: ${formatAmount(income)} บาท\nรายจ่าย: ${formatAmount(expense)} บาท`;
  }
}

function formatAmount(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}
