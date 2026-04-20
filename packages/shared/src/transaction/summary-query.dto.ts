import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

export class SummaryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "month ต้องเป็นจำนวนเต็ม" })
  @Min(1, { message: "month ต้องอยู่ระหว่าง 1-12" })
  @Max(12, { message: "month ต้องอยู่ระหว่าง 1-12" })
  month?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "year ต้องเป็นจำนวนเต็ม" })
  @Min(2000)
  @Max(2100)
  year?: number;
}
