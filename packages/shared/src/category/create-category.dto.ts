import { IsEnum, IsString, MinLength } from 'class-validator';
import { TransactionType } from '../common/transaction-type.enum';

export class CreateCategoryDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  icon!: string;

  @IsEnum(TransactionType)
  type!: TransactionType;
}
