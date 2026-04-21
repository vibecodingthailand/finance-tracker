import Anthropic from "@anthropic-ai/sdk";
import { Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TransactionType } from "@finance-tracker/shared";
import type {
  Category,
  TransactionType as PrismaTransactionType,
} from "@finance-tracker/database";
import { CategoriesRepository } from "../../categories/categories.repository";

export interface CategorizedResult {
  id: string;
  name: string;
}

export interface CategorizeInput {
  userId: string;
  description: string;
  type: TransactionType;
}

const FALLBACK_NAME_TOKEN = "อื่นๆ";

@Injectable()
export class CategorizerService {
  private readonly logger = new Logger(CategorizerService.name);
  private readonly client: Anthropic;
  private readonly cache = new Map<string, CategorizedResult>();

  constructor(
    config: ConfigService,
    private readonly categoriesRepo: CategoriesRepository,
  ) {
    const apiKey = config.getOrThrow<string>("ANTHROPIC_API_KEY");
    this.client = new Anthropic({ apiKey });
  }

  async categorize(input: CategorizeInput): Promise<CategorizedResult> {
    const description = input.description.trim();
    const cacheKey = this.cacheKey(input.userId, input.type, description);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const categories = await this.categoriesRepo.findForUser(
      input.userId,
      input.type as PrismaTransactionType,
    );
    if (categories.length === 0) {
      throw new InternalServerErrorException(
        `ไม่มีหมวดสำหรับประเภท ${input.type}`,
      );
    }

    const fallback = pickFallback(categories);
    let result = fallback;
    try {
      const chosen = await this.askClaude(description, input.type, categories);
      if (chosen) {
        result = chosen;
      }
    } catch (err) {
      this.logger.warn(
        `Claude categorize failed, using fallback: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    this.cache.set(cacheKey, result);
    return result;
  }

  private async askClaude(
    description: string,
    type: TransactionType,
    categories: Category[],
  ): Promise<CategorizedResult | null> {
    const choices = categories.map((c) => c.name).join("\n");
    const typeLabel = type === TransactionType.INCOME ? "รายรับ" : "รายจ่าย";

    const response = await this.client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 64,
      system:
        "คุณเป็นผู้ช่วยจัดหมวดธุรกรรมการเงินภาษาไทย ตอบกลับเฉพาะชื่อหมวดที่ตรงกับรายการในตัวเลือกเท่านั้น ห้ามเพิ่มข้อความอื่น",
      messages: [
        {
          role: "user",
          content: `ประเภท: ${typeLabel}\nคำอธิบาย: ${description}\nตัวเลือกหมวด:\n${choices}\n\nตอบชื่อหมวดที่เหมาะสมที่สุดเพียงชื่อเดียว`,
        },
      ],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    if (!text) {
      return null;
    }

    const match = categories.find((c) => c.name === text);
    return match ? { id: match.id, name: match.name } : null;
  }

  private cacheKey(
    userId: string,
    type: TransactionType,
    description: string,
  ): string {
    return `${userId}|${type}|${description.toLowerCase()}`;
  }
}

function pickFallback(categories: Category[]): CategorizedResult {
  const exact = categories.find((c) => c.name === FALLBACK_NAME_TOKEN);
  const fallback =
    exact ?? categories.find((c) => c.name.includes(FALLBACK_NAME_TOKEN));
  if (!fallback) {
    throw new InternalServerErrorException(
      `ไม่มีหมวดเริ่มต้นสำหรับ fallback`,
    );
  }
  return { id: fallback.id, name: fallback.name };
}
