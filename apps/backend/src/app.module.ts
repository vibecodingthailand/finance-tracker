import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { resolve } from "node:path";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { CategoriesModule } from "./categories/categories.module";
import { TransactionsModule } from "./transactions/transactions.module";
import { RecurringModule } from "./recurring/recurring.module";
import { BudgetModule } from "./budget/budget.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolve(__dirname, "../../../.env"),
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    CategoriesModule,
    TransactionsModule,
    RecurringModule,
    BudgetModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
