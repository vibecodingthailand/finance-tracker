import Anthropic, { APIError } from "@anthropic-ai/sdk";
import { messagingApi } from "@line/bot-sdk";
import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import {
  CategoryAnomaly,
  CategoryInsightBreakdown,
  MonthlyInsightData,
  TransactionType,
} from "@finance-tracker/shared";
import type { Prisma } from "@finance-tracker/database";
import { AuthRepository } from "../auth/auth.repository";
import {
  TransactionWithCategory,
  TransactionsRepository,
} from "../transactions/transactions.repository";
import { InsightRepository } from "./insight.repository";

const ANOMALY_THRESHOLD_PERCENTAGE = 30;
const SUMMARY_MODEL = "claude-haiku-4-5";
const SUMMARY_MAX_TOKENS = 400;
const TOP_CATEGORIES_IN_PROMPT = 5;
const LINE_TEXT_MAX_LENGTH = 5000;

interface CategoryBucket {
  categoryId: string;
  name: string;
  icon: string;
  type: TransactionType;
  total: number;
  count: number;
}

interface MonthAggregate {
  totalIncome: number;
  totalExpense: number;
  incomeBuckets: Map<string, CategoryBucket>;
  expenseBuckets: Map<string, CategoryBucket>;
}

type AggregatedInsight = Omit<MonthlyInsightData, "summary">;

@Injectable()
export class InsightService {
  private readonly logger = new Logger(InsightService.name);
  private readonly client: Anthropic;
  private readonly lineClient: messagingApi.MessagingApiClient;
  private isBroadcasting = false;

  constructor(
    config: ConfigService,
    private readonly transactions: TransactionsRepository,
    private readonly users: AuthRepository,
    private readonly cache: InsightRepository,
  ) {
    const apiKey = config.getOrThrow<string>("ANTHROPIC_API_KEY");
    this.client = new Anthropic({ apiKey });
    const channelAccessToken = config.getOrThrow<string>(
      "LINE_CHANNEL_ACCESS_TOKEN",
    );
    this.lineClient = new messagingApi.MessagingApiClient({
      channelAccessToken,
    });
  }

  async getMonthlyData(
    userId: string,
    month: number,
    year: number,
  ): Promise<MonthlyInsightData> {
    this.validatePeriod(month, year);

    const todayStart = startOfToday();
    const cached = await this.cache.findFresh(userId, month, year, todayStart);
    if (cached) {
      return cached.data as unknown as MonthlyInsightData;
    }

    const current = monthRange(year, month);
    const previous = previousMonthRange(year, month);

    const [currentRows, previousRows] = await Promise.all([
      this.transactions.findInRange(userId, current.start, current.end),
      this.transactions.findInRange(userId, previous.start, previous.end),
    ]);

    const currentAgg = aggregate(currentRows);
    const previousAgg = aggregate(previousRows);

    const data: AggregatedInsight = {
      month,
      year,
      totalIncome: round2(currentAgg.totalIncome),
      totalExpense: round2(currentAgg.totalExpense),
      balance: round2(currentAgg.totalIncome - currentAgg.totalExpense),
      savingsRate: computeSavingsRate(currentAgg),
      byCategoryIncome: toBreakdowns(
        currentAgg.incomeBuckets,
        currentAgg.totalIncome,
      ),
      byCategoryExpense: toBreakdowns(
        currentAgg.expenseBuckets,
        currentAgg.totalExpense,
      ),
      anomalies: detectAnomalies(currentAgg, previousAgg),
    };

    const summary = await this.buildSummary(data);
    const result: MonthlyInsightData = { ...data, summary };

    try {
      await this.cache.upsert({
        userId,
        month,
        year,
        data: result as unknown as Prisma.InputJsonValue,
      });
    } catch (err) {
      this.logger.warn(
        `Insight cache upsert failed: ${err instanceof Error ? err.name : "unknown"}`,
      );
    }

    return result;
  }

  private async buildSummary(data: AggregatedInsight): Promise<string> {
    try {
      const ai = await this.askClaude(data);
      if (ai) return ai;
    } catch (err) {
      this.logger.warn(
        `Claude summary failed, using fallback: ${describeClaudeError(err)}`,
      );
    }
    return buildFallbackSummary(data);
  }

  private async askClaude(data: AggregatedInsight): Promise<string | null> {
    const response = await this.client.messages.create({
      model: SUMMARY_MODEL,
      max_tokens: SUMMARY_MAX_TOKENS,
      system: SUMMARY_SYSTEM_PROMPT,
      messages: [
        { role: "user", content: buildSummaryUserPrompt(data) },
      ],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    return text || null;
  }

  async sendMonthlyInsight(
    userId: string,
    month: number,
    year: number,
  ): Promise<boolean> {
    const user = await this.users.findById(userId);
    if (!user?.lineUserId) {
      return false;
    }
    const data = await this.getMonthlyData(userId, month, year);
    const text = truncateForLine(formatInsightForLine(data));
    await this.lineClient.pushMessage({
      to: user.lineUserId,
      messages: [{ type: "text", text }],
    });
    return true;
  }

  @Cron("0 9 1 * *")
  async runMonthlyBroadcast(): Promise<void> {
    if (this.isBroadcasting) {
      this.logger.warn(
        "Monthly broadcast skipped: previous run still in progress",
      );
      return;
    }
    this.isBroadcasting = true;
    try {
      const now = new Date();
      const { month, year } = previousMonthOf(now);
      const users = await this.users.findAllWithLineUserId();
      this.logger.log(
        `Broadcasting monthly insight ${month}/${year} to ${users.length} user(s)`,
      );
      for (const user of users) {
        try {
          await this.sendMonthlyInsight(user.id, month, year);
        } catch (err) {
          this.logger.error(
            `Failed to send monthly insight to user ${user.id}`,
            err instanceof Error ? err.stack : String(err),
          );
        }
      }
    } finally {
      this.isBroadcasting = false;
    }
  }

  private validatePeriod(month: number, year: number): void {
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new BadRequestException("เดือนต้องอยู่ระหว่าง 1-12");
    }
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new BadRequestException("ปีต้องอยู่ระหว่าง 2000-2100");
    }
  }
}

const SUMMARY_SYSTEM_PROMPT = [
  "คุณเป็นที่ปรึกษาการเงินส่วนตัวชาวไทย สรุปการเงินรายเดือนให้ผู้ใช้",
  "น้ำเสียง: เป็นกันเองแต่มืออาชีพ เหมือนคุยกับเพื่อนที่รู้เรื่องการเงิน",
  "ความยาว: 2-4 ประโยค ตอบเป็น paragraph ไหลลื่น ห้ามใช้ bullet list ห้ามขึ้นต้นด้วยทักทาย",
  "เนื้อหา: ชี้จุดเด่น/จุดที่ต้องระวัง + คำแนะนำที่ทำได้จริงและเจาะจง (เช่น 'ลองตั้งงบอาหารไม่เกิน ฿2,500') หลีกเลี่ยงคำแนะนำทั่วไปอย่าง 'ควรประหยัด'",
  "รูปแบบเงิน: ใช้ ฿12,345.00 (มีสัญลักษณ์ ฿ นำ, ลูกน้ำคั่นหลักพัน, ทศนิยม 2 ตำแหน่ง)",
  "Emoji: ใส่ 1-3 ตัวพอประกอบอารมณ์ อย่ายัดเยอะ",
].join("\n");

function buildSummaryUserPrompt(data: AggregatedInsight): string {
  const lines: string[] = [];
  lines.push(`เดือน: ${formatThaiMonth(data.month, data.year)}`);
  lines.push(`รายรับรวม: ${formatMoney(data.totalIncome)}`);
  lines.push(`รายจ่ายรวม: ${formatMoney(data.totalExpense)}`);
  lines.push(`คงเหลือ: ${formatMoney(data.balance)}`);
  lines.push(`อัตราการออม: ${data.savingsRate}%`);

  if (data.byCategoryExpense.length > 0) {
    lines.push("", "หมวดรายจ่ายสูงสุด:");
    for (const c of data.byCategoryExpense.slice(0, TOP_CATEGORIES_IN_PROMPT)) {
      lines.push(
        `- ${sanitizeCategoryName(c.name)}: ${formatMoney(c.total)} (${c.percentage}%, ${c.count} รายการ)`,
      );
    }
  }

  if (data.byCategoryIncome.length > 0) {
    lines.push("", "หมวดรายรับ:");
    for (const c of data.byCategoryIncome.slice(0, TOP_CATEGORIES_IN_PROMPT)) {
      lines.push(
        `- ${sanitizeCategoryName(c.name)}: ${formatMoney(c.total)} (${c.percentage}%, ${c.count} รายการ)`,
      );
    }
  }

  if (data.anomalies.length > 0) {
    lines.push("", "หมวดที่เปลี่ยนแปลง >30% เทียบเดือนก่อน:");
    for (const a of data.anomalies) {
      const kind = a.type === TransactionType.INCOME ? "รายรับ" : "รายจ่าย";
      const sign = a.changePercentage >= 0 ? "+" : "";
      lines.push(
        `- ${sanitizeCategoryName(a.name)} (${kind}): ${formatMoney(a.previousTotal)} → ${formatMoney(a.currentTotal)} (${sign}${a.changePercentage}%)`,
      );
    }
  }

  return lines.join("\n");
}

function sanitizeCategoryName(name: string): string {
  const stripped = name.replace(/[\r\n\t<>]/g, " ").trim();
  return stripped.length > 60 ? stripped.slice(0, 60) : stripped;
}

function buildFallbackSummary(data: AggregatedInsight): string {
  const header = `เดือน${formatThaiMonth(data.month, data.year)}`;
  const parts = [
    `รายรับ ${formatMoney(data.totalIncome)}`,
    `รายจ่าย ${formatMoney(data.totalExpense)}`,
    `คงเหลือ ${formatMoney(data.balance)}`,
    `อัตราการออม ${data.savingsRate}%`,
  ];
  return `${header}: ${parts.join(" • ")}`;
}

const thaiMonthFormatter = new Intl.DateTimeFormat("th-TH", {
  month: "long",
  year: "numeric",
  calendar: "gregory",
});

function formatThaiMonth(month: number, year: number): string {
  return thaiMonthFormatter.format(new Date(year, month - 1, 1));
}

function formatMoney(n: number): string {
  return `฿${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function computeSavingsRate(agg: MonthAggregate): number {
  if (agg.totalIncome <= 0) return 0;
  return round2(((agg.totalIncome - agg.totalExpense) / agg.totalIncome) * 100);
}

function monthRange(year: number, month: number): { start: Date; end: Date } {
  return {
    start: new Date(year, month - 1, 1, 0, 0, 0, 0),
    end: new Date(year, month, 1, 0, 0, 0, 0),
  };
}

function previousMonthRange(
  year: number,
  month: number,
): { start: Date; end: Date } {
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  return monthRange(prevYear, prevMonth);
}

function aggregate(rows: TransactionWithCategory[]): MonthAggregate {
  const agg: MonthAggregate = {
    totalIncome: 0,
    totalExpense: 0,
    incomeBuckets: new Map(),
    expenseBuckets: new Map(),
  };

  for (const tx of rows) {
    const amount = amountToNumber(tx.amount);
    if (tx.type === TransactionType.INCOME) {
      agg.totalIncome += amount;
      accumulate(agg.incomeBuckets, tx, amount, TransactionType.INCOME);
    } else {
      agg.totalExpense += amount;
      accumulate(agg.expenseBuckets, tx, amount, TransactionType.EXPENSE);
    }
  }

  return agg;
}

function accumulate(
  map: Map<string, CategoryBucket>,
  tx: TransactionWithCategory,
  amount: number,
  type: TransactionType,
): void {
  const existing = map.get(tx.categoryId);
  if (existing) {
    existing.total += amount;
    existing.count += 1;
    return;
  }
  map.set(tx.categoryId, {
    categoryId: tx.categoryId,
    name: tx.category.name,
    icon: tx.category.icon,
    type,
    total: amount,
    count: 1,
  });
}

function toBreakdowns(
  buckets: Map<string, CategoryBucket>,
  grandTotal: number,
): CategoryInsightBreakdown[] {
  return [...buckets.values()]
    .map((b) => ({
      categoryId: b.categoryId,
      name: b.name,
      icon: b.icon,
      total: round2(b.total),
      count: b.count,
      percentage:
        grandTotal > 0 ? round2((b.total / grandTotal) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

function detectAnomalies(
  current: MonthAggregate,
  previous: MonthAggregate,
): CategoryAnomaly[] {
  const anomalies: CategoryAnomaly[] = [];
  collectAnomalies(
    current.incomeBuckets,
    previous.incomeBuckets,
    TransactionType.INCOME,
    anomalies,
  );
  collectAnomalies(
    current.expenseBuckets,
    previous.expenseBuckets,
    TransactionType.EXPENSE,
    anomalies,
  );
  return anomalies.sort(
    (a, b) => Math.abs(b.changePercentage) - Math.abs(a.changePercentage),
  );
}

function collectAnomalies(
  current: Map<string, CategoryBucket>,
  previous: Map<string, CategoryBucket>,
  type: TransactionType,
  out: CategoryAnomaly[],
): void {
  const seen = new Set<string>();

  for (const [categoryId, bucket] of current) {
    seen.add(categoryId);
    const prev = previous.get(categoryId);
    const previousTotal = prev ? prev.total : 0;
    const change = computeChange(previousTotal, bucket.total);
    if (change === null || Math.abs(change) <= ANOMALY_THRESHOLD_PERCENTAGE) {
      continue;
    }
    out.push({
      categoryId,
      name: bucket.name,
      icon: bucket.icon,
      type,
      previousTotal: round2(previousTotal),
      currentTotal: round2(bucket.total),
      changePercentage: round2(change),
    });
  }

  for (const [categoryId, prev] of previous) {
    if (seen.has(categoryId)) continue;
    const change = computeChange(prev.total, 0);
    if (change === null || Math.abs(change) <= ANOMALY_THRESHOLD_PERCENTAGE) {
      continue;
    }
    out.push({
      categoryId,
      name: prev.name,
      icon: prev.icon,
      type,
      previousTotal: round2(prev.total),
      currentTotal: 0,
      changePercentage: round2(change),
    });
  }
}

function computeChange(previous: number, current: number): number | null {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return 100;
  return ((current - previous) / previous) * 100;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function amountToNumber(amount: Prisma.Decimal | number): number {
  return typeof amount === "number" ? amount : amount.toNumber();
}

function describeClaudeError(err: unknown): string {
  if (err instanceof APIError) {
    return `APIError(status=${err.status ?? "unknown"}, type=${err.type ?? "unknown"})`;
  }
  if (err instanceof Error) {
    return err.name;
  }
  return "unknown";
}

export function formatInsightForLine(data: MonthlyInsightData): string {
  const lines: string[] = [];
  lines.push(`📊 สรุปเดือน${formatThaiMonth(data.month, data.year)}`);
  lines.push("");
  lines.push(`รายรับ: ${formatMoney(data.totalIncome)}`);
  lines.push(`รายจ่าย: ${formatMoney(data.totalExpense)}`);
  lines.push(`คงเหลือ: ${formatMoney(data.balance)}`);
  lines.push(`อัตราการออม: ${data.savingsRate}%`);

  if (data.byCategoryExpense.length > 0) {
    lines.push("", "หมวดรายจ่ายสูงสุด:");
    for (const c of data.byCategoryExpense.slice(0, TOP_CATEGORIES_IN_PROMPT)) {
      lines.push(`• ${c.name} ${formatMoney(c.total)} (${c.percentage}%)`);
    }
  }

  if (data.summary) {
    lines.push("", data.summary);
  }

  return lines.join("\n");
}

export function truncateForLine(text: string): string {
  if (text.length <= LINE_TEXT_MAX_LENGTH) return text;
  const ellipsis = "…";
  return text.slice(0, LINE_TEXT_MAX_LENGTH - ellipsis.length) + ellipsis;
}

function previousMonthOf(date: Date): { month: number; year: number } {
  const m = date.getMonth();
  if (m === 0) {
    return { month: 12, year: date.getFullYear() - 1 };
  }
  return { month: m, year: date.getFullYear() };
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}
