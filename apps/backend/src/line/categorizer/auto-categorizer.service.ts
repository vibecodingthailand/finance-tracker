import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { CategoryResponse, TransactionType } from '@finance-tracker/shared';

const SYSTEM_PROMPT =
  'You are a financial transaction categorizer. Given a transaction description and a JSON array of categories, reply with ONLY a JSON object in the format {"id":"<category_id>"} that best fits. No explanation, no extra text, no markdown.';

const MAX_CACHE_SIZE = 1000;

@Injectable()
export class AutoCategorizerService {
  private readonly logger = new Logger(AutoCategorizerService.name);
  private readonly anthropic: Anthropic;
  private readonly cache = new Map<string, string>();

  constructor(private readonly config: ConfigService) {
    this.anthropic = new Anthropic({
      apiKey: this.config.getOrThrow<string>('ANTHROPIC_API_KEY'),
    });
  }

  async categorize(
    description: string,
    type: TransactionType,
    categories: CategoryResponse[],
    userId: string,
  ): Promise<CategoryResponse> {
    const filtered = categories.filter((c) => c.type === type);
    if (filtered.length === 0) throw new Error(`No categories available for type: ${type}`);

    const cacheKey = `${userId}:${type}:${description.toLowerCase().trim()}`;
    const cachedId = this.cache.get(cacheKey);
    if (cachedId) {
      const hit = filtered.find((c) => c.id === cachedId);
      if (hit) return hit;
    }

    const pickedId = await this.callHaiku(description, filtered).catch((err: unknown) => {
      this.logger.error('Haiku categorization failed', err);
      return null;
    });

    const category =
      (pickedId ? filtered.find((c) => c.id === pickedId) : null) ?? this.fallback(filtered);

    this.rememberCategory(cacheKey, category.id);
    return category;
  }

  private rememberCategory(cacheKey: string, categoryId: string): void {
    if (this.cache.size >= MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) this.cache.delete(oldestKey);
    }
    this.cache.set(cacheKey, categoryId);
  }

  private async callHaiku(description: string, categories: CategoryResponse[]): Promise<string> {
    const response = await this.anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 64,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Transaction: "${description}"\n\nCategories:\n${JSON.stringify(categories)}`,
        },
      ],
    });

    const block = response.content[0];
    if (!block || block.type !== 'text') throw new Error('Unexpected response from Haiku');

    const raw = block.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const parsed: unknown = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !('id' in parsed) ||
      typeof (parsed as { id: unknown }).id !== 'string'
    ) {
      throw new Error('Haiku response missing or invalid id field');
    }
    return (parsed as { id: string }).id;
  }

  private fallback(categories: CategoryResponse[]): CategoryResponse {
    return (categories.find((c) => c.name === 'อื่นๆ') ?? categories[0]) as CategoryResponse;
  }
}
