import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { LinkCodeResponse } from '@finance-tracker/shared';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LinkService } from './link.service';

@Controller('link')
export class LinkController {
  constructor(private readonly linkService: LinkService) {}

  @Post('code')
  @HttpCode(201)
  @UseGuards(JwtAuthGuard)
  createCode(@CurrentUser() user: AuthUser): Promise<LinkCodeResponse> {
    return this.linkService.createCode(user.userId);
  }
}
