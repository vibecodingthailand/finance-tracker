import { Module } from '@nestjs/common';
import { CategoryRepo } from '../category/category.repo';
import { LinkModule } from '../link/link.module';
import { AutoCategorizerService } from './categorizer/auto-categorizer.service';
import { LineController } from './line.controller';
import { LineRepo } from './line.repo';
import { LineService } from './line.service';
import { LineSignatureGuard } from './line-signature.guard';

@Module({
  imports: [LinkModule],
  controllers: [LineController],
  providers: [LineService, LineSignatureGuard, AutoCategorizerService, LineRepo, CategoryRepo],
})
export class LineModule {}
