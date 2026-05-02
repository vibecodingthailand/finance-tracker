import { Injectable } from '@nestjs/common';
import { LinkCode } from '@finance-tracker/database';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LinkRepo {
  constructor(private readonly prisma: PrismaService) {}

  create(data: { code: string; userId: string; expiresAt: Date }): Promise<LinkCode> {
    return this.prisma.linkCode.create({ data });
  }

  findValid(code: string): Promise<LinkCode | null> {
    return this.prisma.linkCode.findFirst({
      where: { code, usedAt: null, expiresAt: { gt: new Date() } },
    });
  }

  markUsed(id: string): Promise<LinkCode> {
    return this.prisma.linkCode.update({ where: { id }, data: { usedAt: new Date() } });
  }
}
