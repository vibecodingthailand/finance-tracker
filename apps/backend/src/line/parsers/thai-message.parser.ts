import { TransactionType } from '@finance-tracker/shared';

const INCOME_PREFIXES = ['เงินเดือน', 'รายได้', 'โบนัส', 'ค่าจ้าง'];

const MESSAGE_PATTERN = /^(.+?)\s+([\d,]+(?:\.\d+)?)$/;

export type ParsedTransaction = {
  amount: number;
  type: TransactionType;
  description: string;
};

export function parseThaiMessage(text: string): ParsedTransaction | null {
  const match = text.trim().match(MESSAGE_PATTERN);
  if (!match || !match[1] || !match[2]) return null;

  const description = match[1].trim();
  const amount = parseFloat(match[2].replace(/,/g, ''));

  if (!isFinite(amount) || amount <= 0) return null;

  const type = INCOME_PREFIXES.some((prefix) => description.startsWith(prefix))
    ? TransactionType.INCOME
    : TransactionType.EXPENSE;

  return { amount, type, description };
}
