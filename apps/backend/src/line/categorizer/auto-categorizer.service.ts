import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { CategoryResponse, TransactionType } from '@finance-tracker/shared';

const SYSTEM_PROMPT =
  'You are a financial transaction categorizer. Given a transaction description and a list of categories, reply with ONLY the category ID that best fits. No explanation, no extra text.';

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
    const categoryList = categories.map((c) => `${c.id}: ${c.name}`).join('\n');

    const response = await this.anthropic.messages.create({
      model: 'claude-haiku-4-5',
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
          content: `Transaction: "${description}"\n\nCategories:\n${categoryList}`,
        },
      ],
    });

    const block = response.content[0];
    if (!block || block.type !== 'text') throw new Error('Unexpected response from Haiku');
    return block.text.trim();
  }

  private fallback(categories: CategoryResponse[]): CategoryResponse {
    return (categories.find((c) => c.name === 'อื่นๆ') ?? categories[0]) as CategoryResponse;
  }
}
