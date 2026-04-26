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
import { CreateBudgetDto, UpdateBudgetDto } from '@finance-tracker/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetBudgetStatusQueryDto } from './get-budget-status-query.dto';
import { BudgetService } from './budget.service';

interface AuthRequest {
  user: { userId: string; email: string };
}

@UseGuards(JwtAuthGuard)
@Controller('budgets')
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Post()
  create(@Request() req: AuthRequest, @Body() dto: CreateBudgetDto) {
    return this.budgetService.create(req.user.userId, dto);
  }

  @Get('status')
  getStatus(@Request() req: AuthRequest, @Query() query: GetBudgetStatusQueryDto) {
    return this.budgetService.getStatus(req.user.userId, query.month, query.year);
  }

  @Patch(':id')
  update(@Request() req: AuthRequest, @Param('id') id: string, @Body() dto: UpdateBudgetDto) {
    return this.budgetService.update(req.user.userId, id, dto);
  }

  @HttpCode(204)
  @Delete(':id')
  delete(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.budgetService.delete(req.user.userId, id);
  }
}
