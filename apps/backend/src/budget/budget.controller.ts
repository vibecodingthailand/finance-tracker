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
import { CreateBudgetDto, UpdateBudgetDto } from '@finance-tracker/shared';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetBudgetStatusQueryDto } from './get-budget-status-query.dto';
import { BudgetService } from './budget.service';

@UseGuards(JwtAuthGuard)
@Controller('budgets')
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBudgetDto) {
    return this.budgetService.create(user.userId, dto);
  }

  @Get('status')
  getStatus(@CurrentUser() user: AuthUser, @Query() query: GetBudgetStatusQueryDto) {
    return this.budgetService.getStatus(user.userId, query.month, query.year);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateBudgetDto) {
    return this.budgetService.update(user.userId, id, dto);
  }

  @HttpCode(204)
  @Delete(':id')
  delete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.budgetService.delete(user.userId, id);
  }
}
