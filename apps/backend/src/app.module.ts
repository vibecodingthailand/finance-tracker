import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { resolve } from 'node:path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CategoryModule } from './category/category.module';
import { PrismaModule } from './prisma/prisma.module';
import { BudgetModule } from './budget/budget.module';
import { RecurringModule } from './recurring/recurring.module';
import { TransactionModule } from './transaction/transaction.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolve(__dirname, '../../../.env'),
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    CategoryModule,
    TransactionModule,
    RecurringModule,
    BudgetModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
