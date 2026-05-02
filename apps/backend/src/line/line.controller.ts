import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { webhook } from '@line/bot-sdk';
import { LineSignatureGuard } from './line-signature.guard';
import { LineService } from './line.service';

@Controller('line')
export class LineController {
  constructor(private readonly lineService: LineService) {}

  @Post('webhook')
  @HttpCode(200)
  @UseGuards(LineSignatureGuard)
  webhook(@Body() body: webhook.CallbackRequest): void {
    this.lineService.handleWebhook(body);
  }
}
