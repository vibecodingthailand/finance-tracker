import { Injectable } from "@nestjs/common";
import type { LinkCode } from "@finance-tracker/database";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class LinkRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: {
    code: string;
    userId: string;
    expiresAt: Date;
  }): Promise<LinkCode> {
    return this.prisma.linkCode.create({ data: input });
  }

  findByCode(code: string): Promise<LinkCode | null> {
    return this.prisma.linkCode.findUnique({ where: { code } });
  }

  async linkLineUser(input: {
    linkCodeId: string;
    fromUserId: string;
    toUserId: string;
    lineUserId: string;
    usedAt: Date;
  }): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.transaction.updateMany({
        where: { userId: input.fromUserId },
        data: { userId: input.toUserId },
      }),
      this.prisma.category.updateMany({
        where: { userId: input.fromUserId },
        data: { userId: input.toUserId },
      }),
      this.prisma.recurring.updateMany({
        where: { userId: input.fromUserId },
        data: { userId: input.toUserId },
      }),
      this.prisma.budget.updateMany({
        where: { userId: input.fromUserId },
        data: { userId: input.toUserId },
      }),
      this.prisma.user.update({
        where: { id: input.fromUserId },
        data: { lineUserId: null },
      }),
      this.prisma.user.update({
        where: { id: input.toUserId },
        data: { lineUserId: input.lineUserId },
      }),
      this.prisma.linkCode.update({
        where: { id: input.linkCodeId },
        data: { usedAt: input.usedAt },
      }),
      this.prisma.user.delete({ where: { id: input.fromUserId } }),
    ]);
  }
}
