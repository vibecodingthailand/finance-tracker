import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

export class RegisterDto {
  @IsEmail({}, { message: "อีเมลไม่ถูกต้อง" })
  email!: string;

  @IsString({ message: "รหัสผ่านต้องเป็นข้อความ" })
  @MinLength(8, { message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" })
  @MaxLength(72, { message: "รหัสผ่านต้องไม่เกิน 72 ตัวอักษร" })
  password!: string;

  @IsString({ message: "ชื่อต้องเป็นข้อความ" })
  @MinLength(1, { message: "กรุณากรอกชื่อ" })
  @MaxLength(100, { message: "ชื่อต้องไม่เกิน 100 ตัวอักษร" })
  name!: string;
}
