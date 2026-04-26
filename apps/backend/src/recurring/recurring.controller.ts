import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CreateRecurringDto, UpdateRecurringDto } from '@finance-tracker/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RecurringService } from './recurring.service';

interface AuthRequest {
  user: { userId: string; email: string };
}

@UseGuards(JwtAuthGuard)
@Controller('recurring')
export class RecurringController {
  constructor(private readonly recurringService: RecurringService) {}

  @Get()
  findAll(@Request() req: AuthRequest) {
    return this.recurringService.findAll(req.user.userId);
  }

  @Post()
  create(@Request() req: AuthRequest, @Body() dto: CreateRecurringDto) {
    return this.recurringService.create(req.user.userId, dto);
  }

  @Patch(':id')
  update(@Request() req: AuthRequest, @Param('id') id: string, @Body() dto: UpdateRecurringDto) {
    return this.recurringService.update(req.user.userId, id, dto);
  }

  @HttpCode(204)
  @Delete(':id')
  delete(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.recurringService.delete(req.user.userId, id);
  }
}
