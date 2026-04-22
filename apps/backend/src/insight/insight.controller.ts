import { Controller, Get, ParseIntPipe, Query, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { MonthlyInsightData } from "@finance-tracker/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../auth/jwt.strategy";
import { InsightService } from "./insight.service";

@UseGuards(JwtAuthGuard)
@Controller("insights")
export class InsightController {
  constructor(private readonly service: InsightService) {}

  @Throttle({ default: { limit: 20, ttl: 3_600_000 } })
  @Get()
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Query("month", ParseIntPipe) month: number,
    @Query("year", ParseIntPipe) year: number,
  ): Promise<MonthlyInsightData> {
    return this.service.getMonthlyData(user.id, month, year);
  }
}
