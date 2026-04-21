import { Module } from "@nestjs/common";
import { LineController } from "./line.controller";
import { LineService } from "./line.service";
import { LineSignatureGuard } from "./line.signature.guard";

@Module({
  controllers: [LineController],
  providers: [LineService, LineSignatureGuard],
})
export class LineModule {}
