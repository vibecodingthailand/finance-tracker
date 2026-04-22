import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { TransactionsModule } from "../transactions/transactions.module";
import { InsightController } from "./insight.controller";
import { InsightService } from "./insight.service";

@Module({
  imports: [AuthModule, TransactionsModule],
  controllers: [InsightController],
  providers: [InsightService],
  exports: [InsightService],
})
export class InsightModule {}
