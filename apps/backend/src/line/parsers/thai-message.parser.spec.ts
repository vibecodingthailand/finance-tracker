import { TransactionType } from "@finance-tracker/shared";
import { parseThaiMessage } from "./thai-message.parser";

describe("parseThaiMessage", () => {
  describe("expense", () => {
    it("parses a simple expense with integer amount", () => {
      expect(parseThaiMessage("กาแฟ 65")).toEqual({
        type: TransactionType.EXPENSE,
        amount: 65,
        description: "กาแฟ",
      });
    });

    it("parses expense with multi-word description", () => {
      expect(parseThaiMessage("ข้าวมันไก่ร้านเจ๊เนื้อ 80")).toEqual({
        type: TransactionType.EXPENSE,
        amount: 80,
        description: "ข้าวมันไก่ร้านเจ๊เนื้อ",
      });
    });

    it("parses expense with thousand separator", () => {
      expect(parseThaiMessage("ค่าเช่า 8,500")).toEqual({
        type: TransactionType.EXPENSE,
        amount: 8500,
        description: "ค่าเช่า",
      });
    });

    it("parses expense with decimal amount", () => {
      expect(parseThaiMessage("น้ำมัน 1,234.50")).toEqual({
        type: TransactionType.EXPENSE,
        amount: 1234.5,
        description: "น้ำมัน",
      });
    });

    it("does not treat ค่า-prefix as income keyword (only ค่าจ้าง does)", () => {
      expect(parseThaiMessage("ค่ากาแฟ 50")?.type).toBe(
        TransactionType.EXPENSE,
      );
    });
  });

  describe("income", () => {
    it.each([
      ["เงินเดือน 45,000", 45000, "เงินเดือน"],
      ["โบนัส 10,000", 10000, "โบนัส"],
      ["รายได้ 5000", 5000, "รายได้"],
      ["ค่าจ้าง 2000", 2000, "ค่าจ้าง"],
    ])("classifies %s as income", (input, amount, description) => {
      expect(parseThaiMessage(input)).toEqual({
        type: TransactionType.INCOME,
        amount,
        description,
      });
    });

    it("classifies prefix match even with suffix text as income", () => {
      expect(parseThaiMessage("โบนัสปลายปี 50000")).toEqual({
        type: TransactionType.INCOME,
        amount: 50000,
        description: "โบนัสปลายปี",
      });
    });
  });

  describe("normalization", () => {
    it("trims surrounding whitespace", () => {
      expect(parseThaiMessage("  กาแฟ 65  ")?.description).toBe("กาแฟ");
    });

    it("collapses multiple spaces between description and amount", () => {
      expect(parseThaiMessage("กาแฟ   65")).toEqual({
        type: TransactionType.EXPENSE,
        amount: 65,
        description: "กาแฟ",
      });
    });
  });

  describe("invalid input → null", () => {
    it.each([
      ["empty string", ""],
      ["whitespace only", "   "],
      ["no amount", "กาแฟ"],
      ["no description", "65"],
      ["non-numeric trailing token", "กาแฟ abc"],
      ["zero amount", "กาแฟ 0"],
      ["negative sign", "กาแฟ -50"],
      ["malformed thousand grouping", "กาแฟ 1,23"],
      ["trailing dot without decimals", "กาแฟ 65."],
    ])("returns null for %s", (_label, input) => {
      expect(parseThaiMessage(input)).toBeNull();
    });
  });
});
