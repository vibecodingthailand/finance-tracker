import { IsDateString, IsIn, IsOptional } from "class-validator";

export class ExportQueryDto {
  @IsDateString({}, { message: "startDate ต้องเป็น ISO date" })
  startDate!: string;

  @IsDateString({}, { message: "endDate ต้องเป็น ISO date" })
  endDate!: string;

  @IsOptional()
  @IsIn(["csv"], { message: "format ต้องเป็น csv" })
  format?: "csv";
}
