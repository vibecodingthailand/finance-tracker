import { Module } from "@nestjs/common";
import { CategoriesModule } from "../categories/categories.module";
import { CategorizerService } from "./categorizer/categorizer.service";
import { LineController } from "./line.controller";
import { LineService } from "./line.service";
import { LineSignatureGuard } from "./line.signature.guard";

@Module({
  imports: [CategoriesModule],
  controllers: [LineController],
  providers: [LineService, LineSignatureGuard, CategorizerService],
  exports: [CategorizerService],
})
export class LineModule {}
