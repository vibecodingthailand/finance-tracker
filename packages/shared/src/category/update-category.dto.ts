import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdateCategoryDto {
  @IsOptional()
  @IsString({ message: "ชื่อหมวดต้องเป็นข้อความ" })
  @MinLength(1, { message: "กรุณากรอกชื่อหมวด" })
  @MaxLength(50, { message: "ชื่อหมวดต้องไม่เกิน 50 ตัวอักษร" })
  name?: string;

  @IsOptional()
  @IsString({ message: "ไอคอนต้องเป็นข้อความ" })
  @MinLength(1, { message: "กรุณาเลือกไอคอน" })
  @MaxLength(50, { message: "ไอคอนต้องไม่เกิน 50 ตัวอักษร" })
  icon?: string;
}
