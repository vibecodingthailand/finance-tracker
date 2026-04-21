import { TransactionType } from "@finance-tracker/shared";

export interface ParsedThaiMessage {
  type: TransactionType;
  amount: number;
  description: string;
}

const INCOME_PREFIXES = ["เงินเดือน", "รายได้", "โบนัส", "ค่าจ้าง"] as const;

const MESSAGE_PATTERN =
  /^(\S.*?)\s+((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)\s*$/;

export function parseThaiMessage(input: string): ParsedThaiMessage | null {
  if (typeof input !== "string") {
    return null;
  }
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const match = MESSAGE_PATTERN.exec(trimmed);
  if (!match) {
    return null;
  }

  const description = match[1].trim();
  if (description.length === 0) {
    return null;
  }

  const amount = Number(match[2].replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const type = INCOME_PREFIXES.some((prefix) => description.startsWith(prefix))
    ? TransactionType.INCOME
    : TransactionType.EXPENSE;

  return { type, amount, description };
}
