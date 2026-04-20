import { IsEnum, IsString, MaxLength, MinLength } from "class-validator";
import { TransactionType } from "./transaction-type";

export class CreateCategoryDto {
  @IsString({ message: "ชื่อหมวดต้องเป็นข้อความ" })
  @MinLength(1, { message: "กรุณากรอกชื่อหมวด" })
  @MaxLength(50, { message: "ชื่อหมวดต้องไม่เกิน 50 ตัวอักษร" })
  name!: string;

  @IsString({ message: "ไอคอนต้องเป็นข้อความ" })
  @MinLength(1, { message: "กรุณาเลือกไอคอน" })
  @MaxLength(50, { message: "ไอคอนต้องไม่เกิน 50 ตัวอักษร" })
  icon!: string;

  @IsEnum(TransactionType, { message: "ประเภทหมวดไม่ถูกต้อง" })
  type!: TransactionType;
}
