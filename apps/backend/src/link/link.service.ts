import { Injectable } from '@nestjs/common';
import { LinkCodeResponse } from '@finance-tracker/shared';
import { LinkRepo } from './link.repo';

@Injectable()
export class LinkService {
  constructor(private readonly linkRepo: LinkRepo) {}

  async createCode(userId: string): Promise<LinkCodeResponse> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await this.linkRepo.create({ code, userId, expiresAt });
    return { code, expiresAt: expiresAt.toISOString() };
  }
}
