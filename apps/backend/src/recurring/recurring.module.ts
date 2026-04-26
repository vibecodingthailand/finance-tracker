import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RecurringController } from './recurring.controller';
import { RecurringRepo } from './recurring.repo';
import { RecurringService } from './recurring.service';

@Module({
  imports: [AuthModule],
  controllers: [RecurringController],
  providers: [RecurringService, RecurringRepo],
})
export class RecurringModule {}
