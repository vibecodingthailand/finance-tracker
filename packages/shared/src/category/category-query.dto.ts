import { IsEnum, IsOptional } from "class-validator";
import { TransactionType } from "./transaction-type";

export class CategoryQueryDto {
  @IsOptional()
  @IsEnum(TransactionType, { message: "ประเภทหมวดไม่ถูกต้อง" })
  type?: TransactionType;
}
