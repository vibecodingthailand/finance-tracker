import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { validateSignature } from "@line/bot-sdk";
import type { Request } from "express";

type RawBodyRequest = Request & { rawBody?: Buffer };

@Injectable()
export class LineSignatureGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RawBodyRequest>();
    const secret = this.config.get<string>("LINE_CHANNEL_SECRET");
    if (!secret) {
      throw new InternalServerErrorException(
        "LINE_CHANNEL_SECRET is not configured",
      );
    }

    const signature = req.headers["x-line-signature"];
    if (typeof signature !== "string" || signature.length === 0) {
      throw new UnauthorizedException("ไม่พบ LINE signature");
    }

    if (!req.rawBody) {
      throw new BadRequestException(
        "ไม่พบ raw body (ต้องเปิด rawBody ใน main.ts)",
      );
    }

    if (!validateSignature(req.rawBody, secret, signature)) {
      throw new UnauthorizedException("LINE signature ไม่ถูกต้อง");
    }

    return true;
  }
}
