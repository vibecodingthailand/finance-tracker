import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  CreateRecurringDto,
  RecurringResponse,
  UpdateRecurringDto,
} from "@finance-tracker/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../auth/jwt.strategy";
import { RecurringService } from "./recurring.service";

@UseGuards(JwtAuthGuard)
@Controller("recurring")
export class RecurringController {
  constructor(private readonly service: RecurringService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RecurringResponse[]> {
    return this.service.list(user.id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRecurringDto,
  ): Promise<RecurringResponse> {
    return this.service.create(user.id, dto);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateRecurringDto,
  ): Promise<RecurringResponse> {
    return this.service.update(user.id, id, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ): Promise<void> {
    return this.service.delete(user.id, id);
  }
}
