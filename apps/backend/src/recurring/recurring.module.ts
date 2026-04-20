import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CategoriesModule } from "../categories/categories.module";
import { TransactionsModule } from "../transactions/transactions.module";
import { RecurringController } from "./recurring.controller";
import { RecurringRepository } from "./recurring.repository";
import { RecurringService } from "./recurring.service";

@Module({
  imports: [AuthModule, CategoriesModule, TransactionsModule],
  controllers: [RecurringController],
  providers: [RecurringService, RecurringRepository],
})
export class RecurringModule {}
