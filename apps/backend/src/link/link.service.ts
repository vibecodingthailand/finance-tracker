import { randomInt } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import type { LinkCodeResponse } from "@finance-tracker/shared";
import type { LinkCode, User } from "@finance-tracker/database";
import { AuthRepository } from "../auth/auth.repository";
import { LinkRepository } from "./link.repository";

const CODE_TTL_MS = 5 * 60 * 1000;
const MAX_CODE_GEN_ATTEMPTS = 8;

@Injectable()
export class LinkService {
  constructor(
    private readonly repo: LinkRepository,
    private readonly users: AuthRepository,
  ) {}

  async createCode(userId: string): Promise<LinkCodeResponse> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CODE_TTL_MS);

    for (let attempt = 0; attempt < MAX_CODE_GEN_ATTEMPTS; attempt += 1) {
      const code = generateCode();
      const existing = await this.repo.findByCode(code);
      if (existing) continue;
      await this.repo.create({ code, userId, expiresAt });
      return { code, expiresAt: expiresAt.toISOString() };
    }

    throw new InternalServerErrorException(
      "ไม่สามารถสร้างโค้ดเชื่อมบัญชีได้ กรุณาลองใหม่",
    );
  }

  async consumeCode(input: {
    code: string;
    lineUser: User;
  }): Promise<{ webUserId: string }> {
    if (!input.lineUser.lineUserId) {
      throw new BadRequestException("ผู้ใช้ LINE นี้ไม่มี lineUserId");
    }

    const now = new Date();
    const record = await this.findActiveCode(input.code, now);
    if (record.userId === input.lineUser.id) {
      throw new BadRequestException("บัญชีนี้เชื่อมอยู่กับตัวเองไม่ได้");
    }
    const webUser = await this.users.findById(record.userId);
    if (!webUser) {
      throw new NotFoundException("ไม่พบบัญชีเว็บที่เชื่อมกับโค้ดนี้");
    }
    if (webUser.lineUserId) {
      throw new ConflictException("บัญชีเว็บนี้เชื่อม LINE อื่นไว้แล้ว");
    }

    await this.repo.linkLineUser({
      linkCodeId: record.id,
      fromUserId: input.lineUser.id,
      toUserId: webUser.id,
      lineUserId: input.lineUser.lineUserId,
      usedAt: now,
    });

    return { webUserId: webUser.id };
  }

  private async findActiveCode(code: string, now: Date): Promise<LinkCode> {
    const record = await this.repo.findByCode(code);
    if (!record) {
      throw new NotFoundException("โค้ดไม่ถูกต้อง");
    }
    if (record.usedAt) {
      throw new ConflictException("โค้ดนี้ถูกใช้แล้ว");
    }
    if (record.expiresAt <= now) {
      throw new BadRequestException("โค้ดหมดอายุแล้ว");
    }
    return record;
  }
}

function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}
