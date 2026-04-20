import { IsNumber, IsPositive, Max } from "class-validator";

export class UpdateBudgetDto {
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: "จำนวนเงินต้องเป็นตัวเลขและมีทศนิยมไม่เกิน 2 ตำแหน่ง" },
  )
  @IsPositive({ message: "จำนวนเงินต้องมากกว่า 0" })
  @Max(9999999999.99, { message: "จำนวนเงินเกินกำหนด" })
  amount!: number;
}
