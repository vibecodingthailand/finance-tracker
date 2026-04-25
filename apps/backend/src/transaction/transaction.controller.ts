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
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  CreateTransactionDto,
  GetSummaryQueryDto,
  GetTransactionsQueryDto,
  UpdateTransactionDto,
} from '@finance-tracker/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TransactionService } from './transaction.service';

interface AuthRequest {
  user: { userId: string; email: string };
}

@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Get('summary')
  getSummary(@Request() req: AuthRequest, @Query() query: GetSummaryQueryDto) {
    return this.transactionService.getSummary(req.user.userId, query);
  }

  @Get()
  findAll(@Request() req: AuthRequest, @Query() query: GetTransactionsQueryDto) {
    return this.transactionService.findAll(req.user.userId, query);
  }

  @Post()
  create(@Request() req: AuthRequest, @Body() dto: CreateTransactionDto) {
    return this.transactionService.create(req.user.userId, dto);
  }

  @Patch(':id')
  update(@Request() req: AuthRequest, @Param('id') id: string, @Body() dto: UpdateTransactionDto) {
    return this.transactionService.update(req.user.userId, id, dto);
  }

  @HttpCode(204)
  @Delete(':id')
  delete(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.transactionService.delete(req.user.userId, id);
  }
}
