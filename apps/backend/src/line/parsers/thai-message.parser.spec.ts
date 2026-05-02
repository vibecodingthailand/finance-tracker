import { TransactionType } from '@finance-tracker/shared';
import { parseThaiMessage } from './thai-message.parser';

describe('parseThaiMessage', () => {
  describe('expense', () => {
    it('parses a simple expense', () => {
      expect(parseThaiMessage('กาแฟ 65')).toEqual({
        amount: 65,
        type: TransactionType.EXPENSE,
        description: 'กาแฟ',
      });
    });

    it('parses a multi-word expense description', () => {
      expect(parseThaiMessage('ข้าวมันไก่ ราคา 80')).toEqual({
        amount: 80,
        type: TransactionType.EXPENSE,
        description: 'ข้าวมันไก่ ราคา',
      });
    });

    it('parses an amount with comma separator', () => {
      expect(parseThaiMessage('ค่าเช่า 8,500')).toEqual({
        amount: 8500,
        type: TransactionType.EXPENSE,
        description: 'ค่าเช่า',
      });
    });

    it('parses a decimal amount', () => {
      expect(parseThaiMessage('กาแฟ 65.50')).toEqual({
        amount: 65.5,
        type: TransactionType.EXPENSE,
        description: 'กาแฟ',
      });
    });

    it('treats ค่า-prefixed words that are not ค่าจ้าง as expense', () => {
      const result = parseThaiMessage('ค่าแท็กซี่ 150');
      expect(result?.type).toBe(TransactionType.EXPENSE);
    });
  });

  describe('income', () => {
    it('classifies เงินเดือน as income', () => {
      expect(parseThaiMessage('เงินเดือน 45,000')).toEqual({
        amount: 45000,
        type: TransactionType.INCOME,
        description: 'เงินเดือน',
      });
    });

    it('classifies โบนัส as income', () => {
      expect(parseThaiMessage('โบนัส 10,000')).toEqual({
        amount: 10000,
        type: TransactionType.INCOME,
        description: 'โบนัส',
      });
    });

    it('classifies รายได้ as income', () => {
      expect(parseThaiMessage('รายได้ 5000')).toEqual({
        amount: 5000,
        type: TransactionType.INCOME,
        description: 'รายได้',
      });
    });

    it('classifies ค่าจ้าง as income', () => {
      expect(parseThaiMessage('ค่าจ้าง 300')).toEqual({
        amount: 300,
        type: TransactionType.INCOME,
        description: 'ค่าจ้าง',
      });
    });

    it('classifies compound income descriptions by prefix', () => {
      const result = parseThaiMessage('เงินเดือน เดือนพฤษภาคม 45,000');
      expect(result?.type).toBe(TransactionType.INCOME);
      expect(result?.amount).toBe(45000);
    });
  });

  describe('invalid input', () => {
    it('returns null when no amount is present', () => {
      expect(parseThaiMessage('กาแฟ')).toBeNull();
    });

    it('returns null for amount-only input (no description)', () => {
      expect(parseThaiMessage('65')).toBeNull();
    });

    it('returns null for zero amount', () => {
      expect(parseThaiMessage('กาแฟ 0')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(parseThaiMessage('')).toBeNull();
    });

    it('returns null when amount is not a number', () => {
      expect(parseThaiMessage('กาแฟ abc')).toBeNull();
    });
  });
});
