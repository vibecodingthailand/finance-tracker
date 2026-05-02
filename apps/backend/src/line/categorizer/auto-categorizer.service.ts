import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { CategoryResponse, TransactionType } from '@finance-tracker/shared';

const SYSTEM_PROMPT =
  'You are a financial transaction categorizer. Given a transaction description and a JSON array of categories, reply with ONLY a JSON object in the format {"id":"<category_id>"} that best fits. No explanation, no extra text, no markdown.';

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
  ): Promise<CategoryResponse> {
    const filtered = categories.filter((c) => c.type === type);
    if (filtered.length === 0) throw new Error(`No categories available for type: ${type}`);

    const cacheKey = `${description.toLowerCase().trim()}:${type}`;
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

    this.cache.set(cacheKey, category.id);
    return category;
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
    const parsed = JSON.parse(raw) as { id: string };
    if (!parsed.id) throw new Error('Haiku response missing id field');
    return parsed.id;
  }

  private fallback(categories: CategoryResponse[]): CategoryResponse {
    return (categories.find((c) => c.name === 'อื่นๆ') ?? categories[0]) as CategoryResponse;
  }
}
