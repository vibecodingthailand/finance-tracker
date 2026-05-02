import { randomInt } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { LinkCodeResponse } from '@finance-tracker/shared';
import { LinkRepo } from './link.repo';

const LINK_CODE_TTL_MS = 5 * 60 * 1000;
const LINK_CODE_MIN = 100_000;
const LINK_CODE_MAX_EXCLUSIVE = 1_000_000;

@Injectable()
export class LinkService {
  constructor(private readonly linkRepo: LinkRepo) {}

  async createCode(userId: string): Promise<LinkCodeResponse> {
    const code = randomInt(LINK_CODE_MIN, LINK_CODE_MAX_EXCLUSIVE).toString();
    const expiresAt = new Date(Date.now() + LINK_CODE_TTL_MS);
    await this.linkRepo.create({ code, userId, expiresAt });
    return { code, expiresAt: expiresAt.toISOString() };
  }
}
