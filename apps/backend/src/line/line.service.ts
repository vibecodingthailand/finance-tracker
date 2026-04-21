import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { messagingApi, webhook } from "@line/bot-sdk";
import { TransactionType } from "@finance-tracker/shared";
import type { User } from "@finance-tracker/database";
import { AuthRepository } from "../auth/auth.repository";
import { TransactionsRepository } from "../transactions/transactions.repository";
import { CategorizerService } from "./categorizer/categorizer.service";
import {
  parseThaiMessage,
  type ParsedThaiMessage,
} from "./parsers/thai-message.parser";

const HELP_TEXT = [
  "วิธีใช้:",
  "• บันทึกรายจ่าย: \"กาแฟ 65\"",
  "• บันทึกรายรับ: \"เงินเดือน 30000\"",
  "• \"สรุป\" = ยอดวันนี้",
  "• \"เดือนนี้\" = ยอดเดือนนี้",
  "• \"ยกเลิก\" = ลบรายการล่าสุด",
].join("\n");

@Injectable()
export class LineService {
  private readonly logger = new Logger(LineService.name);
  private readonly client: messagingApi.MessagingApiClient;

  constructor(
    config: ConfigService,
    private readonly users: AuthRepository,
    private readonly transactions: TransactionsRepository,
    private readonly categorizer: CategorizerService,
  ) {
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
    if (event.type !== "message") return;
    if (event.message.type !== "text") return;
    const replyToken = event.replyToken;
    if (!replyToken) return;
    const lineUserId = event.source?.userId;
    if (!lineUserId) return;

    const user = await this.findOrCreateUser(lineUserId);
    const reply = await this.buildReply(user.id, event.message.text);

    await this.client.replyMessage({
      replyToken,
      messages: [{ type: "text", text: reply }],
    });
  }

  private async findOrCreateUser(lineUserId: string): Promise<User> {
    const existing = await this.users.findByLineUserId(lineUserId);
    if (existing) return existing;
    return this.users.createLineUser({
      lineUserId,
      name: `LINE ${lineUserId.slice(0, 8)}`,
    });
  }

  private async buildReply(userId: string, text: string): Promise<string> {
    const parsed = parseThaiMessage(text);
    if (parsed) {
      return this.recordTransaction(userId, parsed);
    }
    return this.handleCommand(userId, text.trim());
  }

  private async recordTransaction(
    userId: string,
    parsed: ParsedThaiMessage,
  ): Promise<string> {
    const category = await this.categorizer.categorize({
      userId,
      description: parsed.description,
      type: parsed.type,
    });
    await this.transactions.create({
      userId,
      categoryId: category.id,
      amount: parsed.amount,
      type: parsed.type,
      description: parsed.description,
      source: "LINE",
    });
    const verb =
      parsed.type === TransactionType.INCOME ? "บันทึกรายรับแล้ว" : "บันทึกแล้ว";
    return `${verb}: ${parsed.description} ${formatAmount(parsed.amount)} บาท (${category.name})`;
  }

  private async handleCommand(userId: string, command: string): Promise<string> {
    switch (command) {
      case "สรุป":
        return this.summarizeToday(userId);
      case "เดือนนี้":
        return this.summarizeMonth(userId);
      case "ยกเลิก":
        return this.undoLatest(userId);
      default:
        return HELP_TEXT;
    }
  }

  private async summarizeToday(userId: string): Promise<string> {
    const now = new Date();
    const start = startOfDay(now);
    const end = addDays(start, 1);
    const rows = await this.transactions.findInRange(userId, start, end);
    const { income, expense } = sumByType(rows);
    return [
      `สรุปวันนี้ (${formatDate(now)})`,
      `รายรับ: ${formatAmount(income)} บาท`,
      `รายจ่าย: ${formatAmount(expense)} บาท`,
      `คงเหลือ: ${formatAmount(income - expense)} บาท`,
    ].join("\n");
  }

  private async summarizeMonth(userId: string): Promise<string> {
    const now = new Date();
    const start = startOfMonth(now);
    const end = startOfMonth(addMonths(now, 1));
    const rows = await this.transactions.findInRange(userId, start, end);
    const { income, expense } = sumByType(rows);
    return [
      `สรุปเดือนนี้ (${formatMonth(now)})`,
      `รายรับ: ${formatAmount(income)} บาท`,
      `รายจ่าย: ${formatAmount(expense)} บาท`,
      `คงเหลือ: ${formatAmount(income - expense)} บาท`,
    ].join("\n");
  }

  private async undoLatest(userId: string): Promise<string> {
    const latest = await this.transactions.findLatestForUser(userId);
    if (!latest) {
      return "ไม่มีรายการให้ยกเลิก";
    }
    await this.transactions.delete(latest.id);
    const verb = latest.type === "INCOME" ? "รายรับ" : "รายจ่าย";
    return `ยกเลิกแล้ว: ${latest.description ?? "-"} ${formatAmount(Number(latest.amount))} บาท (${verb})`;
  }
}

function sumByType(rows: { type: string; amount: unknown }[]): {
  income: number;
  expense: number;
} {
  let income = 0;
  let expense = 0;
  for (const row of rows) {
    const amount = Number(row.amount);
    if (!Number.isFinite(amount)) continue;
    if (row.type === "INCOME") income += amount;
    else if (row.type === "EXPENSE") expense += amount;
  }
  return { income, expense };
}

function formatAmount(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(d);
}

function formatMonth(d: Date): string {
  return new Intl.DateTimeFormat("th-TH", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(d);
}

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function startOfMonth(d: Date): Date {
  const out = new Date(d);
  out.setDate(1);
  out.setHours(0, 0, 0, 0);
  return out;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function addMonths(d: Date, n: number): Date {
  const out = new Date(d);
  out.setMonth(out.getMonth() + n);
  return out;
}
