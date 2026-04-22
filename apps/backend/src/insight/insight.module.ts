import { Module } from "@nestjs/common";
import { TransactionsModule } from "../transactions/transactions.module";
import { InsightService } from "./insight.service";

@Module({
  imports: [TransactionsModule],
  providers: [InsightService],
  exports: [InsightService],
})
export class InsightModule {}
