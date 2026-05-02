import { Controller, HttpCode, Post, Request, UseGuards } from '@nestjs/common';
import { LinkCodeResponse } from '@finance-tracker/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LinkService } from './link.service';

interface AuthRequest {
  user: { userId: string };
}

@Controller('link')
export class LinkController {
  constructor(private readonly linkService: LinkService) {}

  @Post('code')
  @HttpCode(201)
  @UseGuards(JwtAuthGuard)
  createCode(@Request() req: AuthRequest): Promise<LinkCodeResponse> {
    return this.linkService.createCode(req.user.userId);
  }
}
