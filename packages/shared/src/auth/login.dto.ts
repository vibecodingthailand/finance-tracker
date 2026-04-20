import { IsEmail, IsString, MinLength } from "class-validator";

export class LoginDto {
  @IsEmail({}, { message: "อีเมลไม่ถูกต้อง" })
  email!: string;

  @IsString({ message: "รหัสผ่านต้องเป็นข้อความ" })
  @MinLength(1, { message: "กรุณากรอกรหัสผ่าน" })
  password!: string;
}
