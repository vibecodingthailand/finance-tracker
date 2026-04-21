import { Controller, Post, UseGuards } from "@nestjs/common";
import type { LinkCodeResponse } from "@finance-tracker/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../auth/jwt.strategy";
import { LinkService } from "./link.service";

@UseGuards(JwtAuthGuard)
@Controller("link")
export class LinkController {
  constructor(private readonly service: LinkService) {}

  @Post("code")
  createCode(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LinkCodeResponse> {
    return this.service.createCode(user.id);
  }
}
