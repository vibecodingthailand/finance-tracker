import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BudgetController } from './budget.controller';
import { BudgetRepo } from './budget.repo';
import { BudgetService } from './budget.service';

@Module({
  imports: [AuthModule],
  controllers: [BudgetController],
  providers: [BudgetService, BudgetRepo],
})
export class BudgetModule {}
