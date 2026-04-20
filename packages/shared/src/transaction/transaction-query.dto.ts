import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import { TransactionType } from "../category/transaction-type";

export class TransactionQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "page ต้องเป็นจำนวนเต็ม" })
  @Min(1, { message: "page ต้องมากกว่าหรือเท่ากับ 1" })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "limit ต้องเป็นจำนวนเต็ม" })
  @Min(1)
  @Max(100, { message: "limit ต้องไม่เกิน 100" })
  limit?: number;

  @IsOptional()
  @IsDateString({}, { message: "startDate ต้องเป็น ISO date" })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: "endDate ต้องเป็น ISO date" })
  endDate?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsEnum(TransactionType, { message: "ประเภทรายการไม่ถูกต้อง" })
  type?: TransactionType;
}
