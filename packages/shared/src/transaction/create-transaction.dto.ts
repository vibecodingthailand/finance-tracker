import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  MinLength,
} from "class-validator";
import { TransactionType } from "../category/transaction-type";

export class CreateTransactionDto {
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: "จำนวนเงินต้องเป็นตัวเลขและมีทศนิยมไม่เกิน 2 ตำแหน่ง" },
  )
  @IsPositive({ message: "จำนวนเงินต้องมากกว่า 0" })
  @Max(9999999999.99, { message: "จำนวนเงินเกินกำหนด" })
  amount!: number;

  @IsEnum(TransactionType, { message: "ประเภทรายการไม่ถูกต้อง" })
  type!: TransactionType;

  @IsOptional()
  @IsString({ message: "รายละเอียดต้องเป็นข้อความ" })
  @MaxLength(500, { message: "รายละเอียดต้องไม่เกิน 500 ตัวอักษร" })
  description?: string;

  @IsString({ message: "categoryId ต้องเป็นข้อความ" })
  @MinLength(1, { message: "กรุณาเลือกหมวด" })
  categoryId!: string;
}
