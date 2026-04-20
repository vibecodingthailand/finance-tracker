import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { TransactionType } from "../category/transaction-type";

export class UpdateRecurringDto {
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: "จำนวนเงินต้องเป็นตัวเลขและมีทศนิยมไม่เกิน 2 ตำแหน่ง" },
  )
  @IsPositive({ message: "จำนวนเงินต้องมากกว่า 0" })
  @Max(9999999999.99, { message: "จำนวนเงินเกินกำหนด" })
  amount?: number;

  @IsOptional()
  @IsEnum(TransactionType, { message: "ประเภทรายการไม่ถูกต้อง" })
  type?: TransactionType;

  @IsOptional()
  @IsString({ message: "รายละเอียดต้องเป็นข้อความ" })
  @MaxLength(500, { message: "รายละเอียดต้องไม่เกิน 500 ตัวอักษร" })
  description?: string;

  @IsOptional()
  @IsString({ message: "categoryId ต้องเป็นข้อความ" })
  @MinLength(1, { message: "กรุณาเลือกหมวด" })
  categoryId?: string;

  @IsOptional()
  @IsInt({ message: "วันที่ต้องเป็นตัวเลขจำนวนเต็ม" })
  @Min(1, { message: "วันที่ต้องอยู่ระหว่าง 1-31" })
  @Max(31, { message: "วันที่ต้องอยู่ระหว่าง 1-31" })
  dayOfMonth?: number;

  @IsOptional()
  @IsBoolean({ message: "สถานะต้องเป็น true หรือ false" })
  active?: boolean;
}
