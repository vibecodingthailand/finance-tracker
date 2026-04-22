import { Injectable } from "@nestjs/common";
import { Prisma } from "@finance-tracker/database";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class WebhookEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async tryClaim(eventId: string, source: string): Promise<boolean> {
    try {
      await this.prisma.webhookEvent.create({ data: { eventId, source } });
      return true;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return false;
      }
      throw err;
    }
  }
}
