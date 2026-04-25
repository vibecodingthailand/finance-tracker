import { IsEnum, IsOptional } from 'class-validator';
import { TransactionType } from '../common/transaction-type.enum';

export class GetCategoriesQueryDto {
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;
}
