import {
  IsInt,
  IsNumber,
  IsPositive,
  IsString,
  Max,
  Min,
  MinLength,
} from "class-validator";

export class CreateBudgetDto {
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: "จำนวนเงินต้องเป็นตัวเลขและมีทศนิยมไม่เกิน 2 ตำแหน่ง" },
  )
  @IsPositive({ message: "จำนวนเงินต้องมากกว่า 0" })
  @Max(9999999999.99, { message: "จำนวนเงินเกินกำหนด" })
  amount!: number;

  @IsString({ message: "categoryId ต้องเป็นข้อความ" })
  @MinLength(1, { message: "กรุณาเลือกหมวด" })
  categoryId!: string;

  @IsInt({ message: "เดือนต้องเป็นตัวเลขจำนวนเต็ม" })
  @Min(1, { message: "เดือนต้องอยู่ระหว่าง 1-12" })
  @Max(12, { message: "เดือนต้องอยู่ระหว่าง 1-12" })
  month!: number;

  @IsInt({ message: "ปีต้องเป็นตัวเลขจำนวนเต็ม" })
  @Min(2000, { message: "ปีต้องอยู่ระหว่าง 2000-2100" })
  @Max(2100, { message: "ปีต้องอยู่ระหว่าง 2000-2100" })
  year!: number;
}
