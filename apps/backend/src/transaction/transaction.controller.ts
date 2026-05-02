import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CreateTransactionDto,
  GetSummaryQueryDto,
  GetTransactionsQueryDto,
  UpdateTransactionDto,
} from '@finance-tracker/shared';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TransactionService } from './transaction.service';

@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Get('summary')
  getSummary(@CurrentUser() user: AuthUser, @Query() query: GetSummaryQueryDto) {
    return this.transactionService.getSummary(user.userId, query);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetTransactionsQueryDto) {
    return this.transactionService.findAll(user.userId, query);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTransactionDto) {
    return this.transactionService.create(user.userId, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateTransactionDto) {
    return this.transactionService.update(user.userId, id, dto);
  }

  @HttpCode(204)
  @Delete(':id')
  delete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.transactionService.delete(user.userId, id);
  }
}
