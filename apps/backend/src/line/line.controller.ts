import { Body, Controller, HttpCode, Logger, Post, UseGuards } from '@nestjs/common';
import { webhook } from '@line/bot-sdk';
import { LineSignatureGuard } from './line-signature.guard';
import { LineService } from './line.service';

@Controller('line')
export class LineController {
  private readonly logger = new Logger(LineController.name);

  constructor(private readonly lineService: LineService) {}

  @Post('webhook')
  @HttpCode(200)
  @UseGuards(LineSignatureGuard)
  webhook(@Body() body: webhook.CallbackRequest): void {
    this.lineService
      .handleWebhook(body)
      .catch((err: unknown) => this.logger.error('Failed to process LINE events', err));
  }
}
