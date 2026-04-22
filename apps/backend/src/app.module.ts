import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { resolve } from "node:path";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { CategoriesModule } from "./categories/categories.module";
import { TransactionsModule } from "./transactions/transactions.module";
import { RecurringModule } from "./recurring/recurring.module";
import { BudgetModule } from "./budget/budget.module";
import { LineModule } from "./line/line.module";
import { LinkModule } from "./link/link.module";
import { InsightModule } from "./insight/insight.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolve(__dirname, "../../../.env"),
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      { name: "default", ttl: 60_000, limit: 100 },
    ]),
    PrismaModule,
    AuthModule,
    CategoriesModule,
    TransactionsModule,
    RecurringModule,
    BudgetModule,
    LineModule,
    LinkModule,
    InsightModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
