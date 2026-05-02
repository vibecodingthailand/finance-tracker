import { Module } from '@nestjs/common';
import { LineController } from './line.controller';
import { LineService } from './line.service';
import { LineSignatureGuard } from './line-signature.guard';
import { AutoCategorizerService } from './categorizer/auto-categorizer.service';

@Module({
  controllers: [LineController],
  providers: [LineService, LineSignatureGuard, AutoCategorizerService],
})
export class LineModule {}
