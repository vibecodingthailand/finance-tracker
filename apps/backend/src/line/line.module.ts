import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CategoriesModule } from "../categories/categories.module";
import { TransactionsModule } from "../transactions/transactions.module";
import { CategorizerService } from "./categorizer/categorizer.service";
import { LineController } from "./line.controller";
import { LineService } from "./line.service";
import { LineSignatureGuard } from "./line.signature.guard";

@Module({
  imports: [AuthModule, CategoriesModule, TransactionsModule],
  controllers: [LineController],
  providers: [LineService, LineSignatureGuard, CategorizerService],
  exports: [CategorizerService],
})
export class LineModule {}
