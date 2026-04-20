import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { TransactionType } from "@finance-tracker/shared";
import { CategoriesRepository } from "../categories/categories.repository";
import { TransactionsRepository } from "./transactions.repository";
import { TransactionsService } from "./transactions.service";

type CategoryRow = {
  id: string;
  name: string;
  icon: string;
  type: TransactionType;
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type TransactionRow = {
  id: string;
  amount: number;
  type: TransactionType;
  description: string | null;
  source: "WEB" | "LINE";
  userId: string;
  categoryId: string;
  createdAt: Date;
  updatedAt: Date;
  category: CategoryRow;
};

function makeCategory(overrides: Partial<CategoryRow> = {}): CategoryRow {
  return {
    id: "cat-food",
    name: "อาหาร",
    icon: "utensils",
    type: TransactionType.EXPENSE,
    userId: "user-1",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function makeTransaction(overrides: Partial<TransactionRow> = {}): TransactionRow {
  const category = overrides.category ?? makeCategory();
  return {
    id: "tx-1",
    amount: 100,
    type: TransactionType.EXPENSE,
    description: "ลาบ",
    source: "WEB",
    userId: "user-1",
    categoryId: category.id,
    createdAt: new Date("2026-04-10T05:00:00.000Z"),
    updatedAt: new Date("2026-04-10T05:00:00.000Z"),
    ...overrides,
    category,
  };
}

describe("TransactionsService", () => {
  let service: TransactionsService;
  let repo: jest.Mocked<TransactionsRepository>;
  let categories: jest.Mocked<CategoriesRepository>;

  beforeEach(async () => {
    const repoMock = {
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      list: jest.fn(),
      findInRange: jest.fn(),
      findForExport: jest.fn(),
    };
    const categoriesMock = {
      findForUser: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      countTransactions: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: TransactionsRepository, useValue: repoMock },
        { provide: CategoriesRepository, useValue: categoriesMock },
      ],
    }).compile();

    service = moduleRef.get(TransactionsService);
    repo = moduleRef.get(TransactionsRepository);
    categories = moduleRef.get(CategoriesRepository);
  });

  describe("create", () => {
    it("creates transaction with user's own category", async () => {
      categories.findById.mockResolvedValue(makeCategory());
      repo.create.mockResolvedValue(makeTransaction());

      const result = await service.create("user-1", {
        amount: 120,
        type: TransactionType.EXPENSE,
        description: "ข้าวมันไก่",
        categoryId: "cat-food",
      });

      expect(repo.create).toHaveBeenCalledWith({
        userId: "user-1",
        categoryId: "cat-food",
        amount: 120,
        type: "EXPENSE",
        description: "ข้าวมันไก่",
      });
      expect(result.amount).toBe(100);
    });

    it("allows seed default category (userId=null)", async () => {
      categories.findById.mockResolvedValue(makeCategory({ userId: null }));
      repo.create.mockResolvedValue(makeTransaction());

      await service.create("user-1", {
        amount: 50,
        type: TransactionType.EXPENSE,
        categoryId: "cat-food",
      });

      expect(repo.create).toHaveBeenCalled();
    });

    it("rejects cross-user category with 403", async () => {
      categories.findById.mockResolvedValue(
        makeCategory({ userId: "other-user" }),
      );
      await expect(
        service.create("user-1", {
          amount: 50,
          type: TransactionType.EXPENSE,
          categoryId: "cat-food",
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it("rejects unknown category with 404", async () => {
      categories.findById.mockResolvedValue(null);
      await expect(
        service.create("user-1", {
          amount: 50,
          type: TransactionType.EXPENSE,
          categoryId: "nope",
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("rejects category type mismatch with 400", async () => {
      categories.findById.mockResolvedValue(
        makeCategory({ type: TransactionType.INCOME }),
      );
      await expect(
        service.create("user-1", {
          amount: 50,
          type: TransactionType.EXPENSE,
          categoryId: "cat-food",
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("list", () => {
    it("forwards filters and defaults page/limit", async () => {
      repo.list.mockResolvedValue({ rows: [makeTransaction()], total: 1 });

      const result = await service.list("user-1", {
        startDate: "2026-04-01T00:00:00.000Z",
        endDate: "2026-04-30T23:59:59.000Z",
        categoryId: "cat-food",
        type: TransactionType.EXPENSE,
      });

      expect(repo.list).toHaveBeenCalledWith({
        userId: "user-1",
        page: 1,
        limit: 20,
        startDate: new Date("2026-04-01T00:00:00.000Z"),
        endDate: new Date("2026-04-30T23:59:59.000Z"),
        categoryId: "cat-food",
        type: "EXPENSE",
      });
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.data).toHaveLength(1);
    });

    it("respects explicit page/limit", async () => {
      repo.list.mockResolvedValue({ rows: [], total: 0 });
      const result = await service.list("user-1", { page: 3, limit: 50 });
      expect(repo.list).toHaveBeenCalledWith(
        expect.objectContaining({ page: 3, limit: 50 }),
      );
      expect(result.page).toBe(3);
      expect(result.limit).toBe(50);
    });
  });

  describe("summary", () => {
    it("aggregates totals, percentages, and daily zero-filled data", async () => {
      const food = makeCategory({ id: "cat-food", name: "อาหาร", icon: "u" });
      const travel = makeCategory({
        id: "cat-travel",
        name: "เดินทาง",
        icon: "car",
      });
      const salary = makeCategory({
        id: "cat-salary",
        name: "เงินเดือน",
        icon: "cash",
        type: TransactionType.INCOME,
      });
      repo.findInRange.mockResolvedValue([
        makeTransaction({
          id: "t1",
          amount: 300,
          type: TransactionType.EXPENSE,
          categoryId: food.id,
          category: food,
          createdAt: new Date(2026, 3, 5, 10),
        }),
        makeTransaction({
          id: "t2",
          amount: 100,
          type: TransactionType.EXPENSE,
          categoryId: food.id,
          category: food,
          createdAt: new Date(2026, 3, 6, 10),
        }),
        makeTransaction({
          id: "t3",
          amount: 100,
          type: TransactionType.EXPENSE,
          categoryId: travel.id,
          category: travel,
          createdAt: new Date(2026, 3, 6, 12),
        }),
        makeTransaction({
          id: "t4",
          amount: 1000,
          type: TransactionType.INCOME,
          categoryId: salary.id,
          category: salary,
          createdAt: new Date(2026, 3, 1, 9),
        }),
      ]);

      const res = await service.summary("user-1", { month: 4, year: 2026 });

      expect(repo.findInRange).toHaveBeenCalledWith(
        "user-1",
        new Date(2026, 3, 1, 0, 0, 0, 0),
        new Date(2026, 4, 1, 0, 0, 0, 0),
      );
      expect(res.totalIncome).toBe(1000);
      expect(res.totalExpense).toBe(500);
      expect(res.balance).toBe(500);

      expect(res.byCategoryExpense).toEqual([
        { name: "อาหาร", icon: "u", total: 400, percentage: 80 },
        { name: "เดินทาง", icon: "car", total: 100, percentage: 20 },
      ]);
      expect(res.byCategoryIncome).toEqual([
        { name: "เงินเดือน", icon: "cash", total: 1000, percentage: 100 },
      ]);

      expect(res.dailyTotals).toHaveLength(30);
      const day1 = res.dailyTotals.find((d) => d.date === "2026-04-01");
      const day5 = res.dailyTotals.find((d) => d.date === "2026-04-05");
      const day6 = res.dailyTotals.find((d) => d.date === "2026-04-06");
      const day10 = res.dailyTotals.find((d) => d.date === "2026-04-10");
      expect(day1).toEqual({ date: "2026-04-01", income: 1000, expense: 0 });
      expect(day5).toEqual({ date: "2026-04-05", income: 0, expense: 300 });
      expect(day6).toEqual({ date: "2026-04-06", income: 0, expense: 200 });
      expect(day10).toEqual({ date: "2026-04-10", income: 0, expense: 0 });
    });

    it("returns zero totals and empty breakdowns when no transactions", async () => {
      repo.findInRange.mockResolvedValue([]);
      const res = await service.summary("user-1", { month: 2, year: 2026 });
      expect(res.totalIncome).toBe(0);
      expect(res.totalExpense).toBe(0);
      expect(res.balance).toBe(0);
      expect(res.byCategoryExpense).toEqual([]);
      expect(res.byCategoryIncome).toEqual([]);
      expect(res.dailyTotals).toHaveLength(28);
      expect(res.dailyTotals.every((d) => d.income === 0 && d.expense === 0)).toBe(
        true,
      );
    });
  });

  describe("update", () => {
    it("rejects non-owner with 403", async () => {
      repo.findById.mockResolvedValue(
        makeTransaction({ userId: "other-user" }),
      );
      await expect(
        service.update("user-1", "tx-1", { amount: 99 }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("throws NotFoundException when transaction missing", async () => {
      repo.findById.mockResolvedValue(null);
      await expect(
        service.update("user-1", "missing", { amount: 99 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("updates amount/description without re-validating category", async () => {
      repo.findById.mockResolvedValue(makeTransaction());
      repo.update.mockResolvedValue(makeTransaction({ amount: 75 }));

      const result = await service.update("user-1", "tx-1", {
        amount: 75,
        description: "ข้าวราดแกง",
      });

      expect(categories.findById).not.toHaveBeenCalled();
      expect(repo.update).toHaveBeenCalledWith("tx-1", {
        amount: 75,
        type: undefined,
        description: "ข้าวราดแกง",
        categoryId: undefined,
      });
      expect(result.amount).toBe(75);
    });

    it("re-validates category when categoryId changes", async () => {
      repo.findById.mockResolvedValue(makeTransaction());
      categories.findById.mockResolvedValue(
        makeCategory({ id: "cat-other", userId: "user-1" }),
      );
      repo.update.mockResolvedValue(makeTransaction());

      await service.update("user-1", "tx-1", { categoryId: "cat-other" });
      expect(categories.findById).toHaveBeenCalledWith("cat-other");
    });

    it("rejects when new type doesn't match existing category", async () => {
      repo.findById.mockResolvedValue(makeTransaction());
      categories.findById.mockResolvedValue(makeCategory());

      await expect(
        service.update("user-1", "tx-1", { type: TransactionType.INCOME }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("exportCsv", () => {
    it("generates CSV with Thai headers, comma-separated amount, and filename", async () => {
      const food = makeCategory({ id: "cat-food", name: "อาหาร", icon: "u" });
      const salary = makeCategory({
        id: "cat-salary",
        name: "เงินเดือน",
        icon: "cash",
        type: TransactionType.INCOME,
      });
      repo.findForExport.mockResolvedValue([
        makeTransaction({
          id: "t1",
          amount: 1234.5,
          type: TransactionType.EXPENSE,
          description: "ข้าวมันไก่",
          categoryId: food.id,
          category: food,
          createdAt: new Date(2026, 3, 5, 10),
        }),
        makeTransaction({
          id: "t2",
          amount: 25000,
          type: TransactionType.INCOME,
          description: null,
          categoryId: salary.id,
          category: salary,
          createdAt: new Date(2026, 3, 1, 9),
        }),
      ]);

      const result = await service.exportCsv("user-1", {
        startDate: "2026-04-01T00:00:00.000Z",
        endDate: "2026-04-30T23:59:59.000Z",
      });

      expect(repo.findForExport).toHaveBeenCalledWith(
        "user-1",
        new Date("2026-04-01T00:00:00.000Z"),
        new Date("2026-04-30T23:59:59.000Z"),
      );
      expect(result.filename).toBe("transactions-20260401-20260430.csv");
      expect(result.content.startsWith("\uFEFF")).toBe(true);
      const lines = result.content.slice(1).split("\r\n");
      expect(lines[0]).toBe("วันที่,รายละเอียด,หมวดหมู่,จำนวน,ประเภท");
      expect(lines[1]).toContain("ข้าวมันไก่");
      expect(lines[1]).toContain("อาหาร");
      expect(lines[1]).toContain(`"1,234.50"`);
      expect(lines[1]).toContain("รายจ่าย");
      expect(lines[2]).toContain("เงินเดือน");
      expect(lines[2]).toContain(`"25,000.00"`);
      expect(lines[2]).toContain("รายรับ");
    });

    it("escapes commas and quotes in description", async () => {
      const food = makeCategory();
      repo.findForExport.mockResolvedValue([
        makeTransaction({
          description: 'ข้าว, "พิเศษ"',
          category: food,
          categoryId: food.id,
        }),
      ]);

      const result = await service.exportCsv("user-1", {
        startDate: "2026-04-01T00:00:00.000Z",
        endDate: "2026-04-30T23:59:59.000Z",
      });
      const dataLine = result.content.slice(1).split("\r\n")[1];
      expect(dataLine).toContain('"ข้าว, ""พิเศษ"""');
    });

    it("rejects startDate after endDate with 400", async () => {
      await expect(
        service.exportCsv("user-1", {
          startDate: "2026-04-30T00:00:00.000Z",
          endDate: "2026-04-01T00:00:00.000Z",
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.findForExport).not.toHaveBeenCalled();
    });

    it("returns CSV with only header when no transactions", async () => {
      repo.findForExport.mockResolvedValue([]);
      const result = await service.exportCsv("user-1", {
        startDate: "2026-04-01T00:00:00.000Z",
        endDate: "2026-04-30T23:59:59.000Z",
      });
      expect(result.content).toBe(
        "\uFEFFวันที่,รายละเอียด,หมวดหมู่,จำนวน,ประเภท",
      );
    });
  });

  describe("delete", () => {
    it("deletes owned transaction", async () => {
      repo.findById.mockResolvedValue(makeTransaction());
      await service.delete("user-1", "tx-1");
      expect(repo.delete).toHaveBeenCalledWith("tx-1");
    });

    it("rejects non-owner with 403", async () => {
      repo.findById.mockResolvedValue(
        makeTransaction({ userId: "other-user" }),
      );
      await expect(service.delete("user-1", "tx-1")).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(repo.delete).not.toHaveBeenCalled();
    });

    it("throws NotFoundException when transaction missing", async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.delete("user-1", "missing")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
