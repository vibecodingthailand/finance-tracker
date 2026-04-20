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
} from "@nestjs/common";
import {
  CreateTransactionDto,
  PaginatedTransactions,
  SummaryQueryDto,
  SummaryResponse,
  TransactionQueryDto,
  TransactionResponse,
  UpdateTransactionDto,
} from "@finance-tracker/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../auth/jwt.strategy";
import { TransactionsService } from "./transactions.service";

@UseGuards(JwtAuthGuard)
@Controller("transactions")
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTransactionDto,
  ): Promise<TransactionResponse> {
    return this.service.create(user.id, dto);
  }

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: TransactionQueryDto,
  ): Promise<PaginatedTransactions> {
    return this.service.list(user.id, query);
  }

  @Get("summary")
  summary(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SummaryQueryDto,
  ): Promise<SummaryResponse> {
    return this.service.summary(user.id, query);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateTransactionDto,
  ): Promise<TransactionResponse> {
    return this.service.update(user.id, id, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ): Promise<void> {
    return this.service.delete(user.id, id);
  }
}
