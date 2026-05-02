import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CategoryModule } from '../category/category.module';
import { RecurringController } from './recurring.controller';
import { RecurringRepo } from './recurring.repo';
import { RecurringService } from './recurring.service';

@Module({
  imports: [AuthModule, CategoryModule],
  controllers: [RecurringController],
  providers: [RecurringService, RecurringRepo],
})
export class RecurringModule {}
