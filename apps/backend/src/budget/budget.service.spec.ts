import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { TransactionType } from "@finance-tracker/shared";
import { CategoriesRepository } from "../categories/categories.repository";
import { TransactionsRepository } from "../transactions/transactions.repository";
import { BudgetRepository } from "./budget.repository";
import { BudgetService } from "./budget.service";

type CategoryRow = {
  id: string;
  name: string;
  icon: string;
  type: TransactionType;
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type BudgetRow = {
  id: string;
  amount: number;
  userId: string;
  categoryId: string;
  month: number;
  year: number;
  createdAt: Date;
  updatedAt: Date;
  category: CategoryRow;
};

type TransactionRow = {
  id: string;
  amount: number;
  type: TransactionType;
  description: string | null;
  source: "MANUAL" | "RECURRING";
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

function makeBudget(overrides: Partial<BudgetRow> = {}): BudgetRow {
  const category = overrides.category ?? makeCategory();
  return {
    id: "budget-1",
    amount: 5000,
    userId: "user-1",
    categoryId: category.id,
    month: 4,
    year: 2026,
    createdAt: new Date("2026-04-01T00:00:00.000Z"),
    updatedAt: new Date("2026-04-01T00:00:00.000Z"),
    ...overrides,
    category,
  };
}

function makeTransaction(
  overrides: Partial<TransactionRow> = {},
): TransactionRow {
  const category = overrides.category ?? makeCategory();
  return {
    id: "tx-1",
    amount: 100,
    type: TransactionType.EXPENSE,
    description: null,
    source: "MANUAL",
    userId: "user-1",
    categoryId: category.id,
    createdAt: new Date(2026, 3, 5, 10),
    updatedAt: new Date(2026, 3, 5, 10),
    ...overrides,
    category,
  };
}

describe("BudgetService", () => {
  let service: BudgetService;
  let repo: jest.Mocked<BudgetRepository>;
  let categories: jest.Mocked<CategoriesRepository>;
  let transactions: jest.Mocked<TransactionsRepository>;

  beforeEach(async () => {
    const repoMock = {
      findById: jest.fn(),
      findForUserPeriod: jest.fn(),
      findForPeriodKey: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    const categoriesMock = {
      findForUser: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      countTransactions: jest.fn(),
    };
    const transactionsMock = {
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      list: jest.fn(),
      findInRange: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        BudgetService,
        { provide: BudgetRepository, useValue: repoMock },
        { provide: CategoriesRepository, useValue: categoriesMock },
        { provide: TransactionsRepository, useValue: transactionsMock },
      ],
    }).compile();

    service = moduleRef.get(BudgetService);
    repo = moduleRef.get(BudgetRepository);
    categories = moduleRef.get(CategoriesRepository);
    transactions = moduleRef.get(TransactionsRepository);
  });

  describe("create", () => {
    it("creates budget for an expense category", async () => {
      categories.findById.mockResolvedValue(makeCategory());
      repo.findForPeriodKey.mockResolvedValue(null);
      repo.create.mockResolvedValue(makeBudget() as never);

      await service.create("user-1", {
        amount: 5000,
        categoryId: "cat-food",
        month: 4,
        year: 2026,
      });

      expect(repo.create).toHaveBeenCalledWith({
        userId: "user-1",
        categoryId: "cat-food",
        amount: 5000,
        month: 4,
        year: 2026,
      });
    });

    it("allows seed default category (userId=null)", async () => {
      categories.findById.mockResolvedValue(makeCategory({ userId: null }));
      repo.findForPeriodKey.mockResolvedValue(null);
      repo.create.mockResolvedValue(makeBudget() as never);

      await service.create("user-1", {
        amount: 1000,
        categoryId: "cat-food",
        month: 4,
        year: 2026,
      });

      expect(repo.create).toHaveBeenCalled();
    });

    it("rejects cross-user category with 403", async () => {
      categories.findById.mockResolvedValue(
        makeCategory({ userId: "other-user" }),
      );
      await expect(
        service.create("user-1", {
          amount: 1000,
          categoryId: "cat-food",
          month: 4,
          year: 2026,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it("rejects unknown category with 404", async () => {
      categories.findById.mockResolvedValue(null);
      await expect(
        service.create("user-1", {
          amount: 1000,
          categoryId: "nope",
          month: 4,
          year: 2026,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("rejects non-expense category with 400", async () => {
      categories.findById.mockResolvedValue(
        makeCategory({ type: TransactionType.INCOME }),
      );
      await expect(
        service.create("user-1", {
          amount: 1000,
          categoryId: "cat-food",
          month: 4,
          year: 2026,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects duplicate budget for same category/month/year with 409", async () => {
      categories.findById.mockResolvedValue(makeCategory());
      repo.findForPeriodKey.mockResolvedValue(makeBudget() as never);
      await expect(
        service.create("user-1", {
          amount: 1000,
          categoryId: "cat-food",
          month: 4,
          year: 2026,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it("rejects invalid month/year with 400", async () => {
      await expect(
        service.create("user-1", {
          amount: 1000,
          categoryId: "cat-food",
          month: 13,
          year: 2026,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.create("user-1", {
          amount: 1000,
          categoryId: "cat-food",
          month: 4,
          year: 1999,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(categories.findById).not.toHaveBeenCalled();
    });
  });

  describe("status", () => {
    it("returns empty array when no budgets set", async () => {
      repo.findForUserPeriod.mockResolvedValue([]);
      const result = await service.status("user-1", 4, 2026);
      expect(result).toEqual([]);
      expect(transactions.findInRange).not.toHaveBeenCalled();
    });

    it("aggregates expense transactions per category in period", async () => {
      const food = makeCategory({ id: "cat-food", name: "อาหาร", icon: "u" });
      const travel = makeCategory({
        id: "cat-travel",
        name: "เดินทาง",
        icon: "car",
      });
      repo.findForUserPeriod.mockResolvedValue([
        makeBudget({
          id: "b1",
          amount: 5000,
          categoryId: food.id,
          category: food,
        }),
        makeBudget({
          id: "b2",
          amount: 2000,
          categoryId: travel.id,
          category: travel,
        }),
      ] as never);
      transactions.findInRange.mockResolvedValue([
        makeTransaction({
          id: "t1",
          amount: 1500,
          categoryId: food.id,
          category: food,
        }),
        makeTransaction({
          id: "t2",
          amount: 500,
          categoryId: food.id,
          category: food,
        }),
        makeTransaction({
          id: "t3",
          amount: 2500,
          categoryId: travel.id,
          category: travel,
        }),
        makeTransaction({
          id: "t4",
          amount: 999,
          type: TransactionType.INCOME,
          categoryId: food.id,
          category: food,
        }),
      ] as never);

      const result = await service.status("user-1", 4, 2026);

      expect(transactions.findInRange).toHaveBeenCalledWith(
        "user-1",
        new Date(2026, 3, 1, 0, 0, 0, 0),
        new Date(2026, 4, 1, 0, 0, 0, 0),
      );
      expect(result).toEqual([
        {
          categoryName: "อาหาร",
          categoryIcon: "u",
          budgetAmount: 5000,
          spentAmount: 2000,
          percentage: 40,
          isOverBudget: false,
        },
        {
          categoryName: "เดินทาง",
          categoryIcon: "car",
          budgetAmount: 2000,
          spentAmount: 2500,
          percentage: 125,
          isOverBudget: true,
        },
      ]);
    });

    it("returns zero spent/percentage when no matching transactions", async () => {
      repo.findForUserPeriod.mockResolvedValue([makeBudget()] as never);
      transactions.findInRange.mockResolvedValue([]);
      const result = await service.status("user-1", 4, 2026);
      expect(result[0].spentAmount).toBe(0);
      expect(result[0].percentage).toBe(0);
      expect(result[0].isOverBudget).toBe(false);
    });

    it("rejects invalid month with 400", async () => {
      await expect(service.status("user-1", 0, 2026)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe("update", () => {
    it("updates owned budget amount", async () => {
      repo.findById.mockResolvedValue(makeBudget() as never);
      repo.update.mockResolvedValue(makeBudget({ amount: 6000 }) as never);
      await service.update("user-1", "budget-1", { amount: 6000 });
      expect(repo.update).toHaveBeenCalledWith("budget-1", { amount: 6000 });
    });

    it("rejects non-owner with 403", async () => {
      repo.findById.mockResolvedValue(
        makeBudget({ userId: "other-user" }) as never,
      );
      await expect(
        service.update("user-1", "budget-1", { amount: 6000 }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it("throws NotFoundException when budget missing", async () => {
      repo.findById.mockResolvedValue(null);
      await expect(
        service.update("user-1", "missing", { amount: 6000 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("delete", () => {
    it("deletes owned budget", async () => {
      repo.findById.mockResolvedValue(makeBudget() as never);
      await service.delete("user-1", "budget-1");
      expect(repo.delete).toHaveBeenCalledWith("budget-1");
    });

    it("rejects non-owner with 403", async () => {
      repo.findById.mockResolvedValue(
        makeBudget({ userId: "other-user" }) as never,
      );
      await expect(service.delete("user-1", "budget-1")).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(repo.delete).not.toHaveBeenCalled();
    });

    it("throws NotFoundException when budget missing", async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.delete("user-1", "missing")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
