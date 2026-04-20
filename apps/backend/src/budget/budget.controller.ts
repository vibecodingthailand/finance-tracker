import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  BudgetStatusResponse,
  CreateBudgetDto,
  UpdateBudgetDto,
} from "@finance-tracker/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../auth/jwt.strategy";
import { BudgetService } from "./budget.service";

@UseGuards(JwtAuthGuard)
@Controller("budgets")
export class BudgetController {
  constructor(private readonly service: BudgetService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBudgetDto,
  ): Promise<void> {
    return this.service.create(user.id, dto);
  }

  @Get("status")
  status(
    @CurrentUser() user: AuthenticatedUser,
    @Query("month", ParseIntPipe) month: number,
    @Query("year", ParseIntPipe) year: number,
  ): Promise<BudgetStatusResponse> {
    return this.service.status(user.id, month, year);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateBudgetDto,
  ): Promise<void> {
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
