import {
  Body,
  Controller,
  HttpCode,
  Post,
  UseGuards,
} from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import type { webhook } from "@line/bot-sdk";
import { LineSignatureGuard } from "./line.signature.guard";
import { LineService } from "./line.service";

@Controller("line")
export class LineController {
  constructor(private readonly service: LineService) {}

  @SkipThrottle()
  @Post("webhook")
  @UseGuards(LineSignatureGuard)
  @HttpCode(200)
  webhook(@Body() body: webhook.CallbackRequest): { ok: true } {
    this.service.processEvents(body.events ?? []);
    return { ok: true };
  }
}
