import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { TransactionType } from "@finance-tracker/shared";
import { CategoriesRepository } from "../categories/categories.repository";
import { TransactionsRepository } from "../transactions/transactions.repository";
import { RecurringRepository } from "./recurring.repository";
import { RecurringService } from "./recurring.service";

type CategoryRow = {
  id: string;
  name: string;
  icon: string;
  type: TransactionType;
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type RecurringRow = {
  id: string;
  amount: number;
  type: TransactionType;
  description: string | null;
  userId: string;
  categoryId: string;
  dayOfMonth: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  category: CategoryRow;
};

function makeCategory(overrides: Partial<CategoryRow> = {}): CategoryRow {
  return {
    id: "cat-rent",
    name: "ค่าเช่า",
    icon: "home",
    type: TransactionType.EXPENSE,
    userId: "user-1",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function makeRecurring(overrides: Partial<RecurringRow> = {}): RecurringRow {
  const category = overrides.category ?? makeCategory();
  return {
    id: "rec-1",
    amount: 8000,
    type: TransactionType.EXPENSE,
    description: "ค่าเช่าคอนโด",
    userId: "user-1",
    categoryId: category.id,
    dayOfMonth: 5,
    active: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
    category,
  };
}

describe("RecurringService", () => {
  let service: RecurringService;
  let repo: jest.Mocked<RecurringRepository>;
  let categories: jest.Mocked<CategoriesRepository>;
  let transactions: jest.Mocked<TransactionsRepository>;

  beforeEach(async () => {
    const repoMock = {
      findById: jest.fn(),
      findForUser: jest.fn(),
      findActiveByDayOfMonth: jest.fn(),
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
        RecurringService,
        { provide: RecurringRepository, useValue: repoMock },
        { provide: CategoriesRepository, useValue: categoriesMock },
        { provide: TransactionsRepository, useValue: transactionsMock },
      ],
    }).compile();

    service = moduleRef.get(RecurringService);
    repo = moduleRef.get(RecurringRepository);
    categories = moduleRef.get(CategoriesRepository);
    transactions = moduleRef.get(TransactionsRepository);
  });

  describe("list", () => {
    it("returns user's recurring items mapped to response", async () => {
      repo.findForUser.mockResolvedValue([makeRecurring()]);
      const result = await service.list("user-1");
      expect(repo.findForUser).toHaveBeenCalledWith("user-1");
      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(8000);
      expect(result[0].dayOfMonth).toBe(5);
      expect(result[0].active).toBe(true);
    });
  });

  describe("create", () => {
    it("creates with user's own category", async () => {
      categories.findById.mockResolvedValue(makeCategory());
      repo.create.mockResolvedValue(makeRecurring());

      const result = await service.create("user-1", {
        amount: 8000,
        type: TransactionType.EXPENSE,
        description: "ค่าเช่าคอนโด",
        categoryId: "cat-rent",
        dayOfMonth: 5,
      });

      expect(repo.create).toHaveBeenCalledWith({
        userId: "user-1",
        categoryId: "cat-rent",
        amount: 8000,
        type: "EXPENSE",
        description: "ค่าเช่าคอนโด",
        dayOfMonth: 5,
      });
      expect(result.id).toBe("rec-1");
    });

    it("rejects cross-user category with 403", async () => {
      categories.findById.mockResolvedValue(
        makeCategory({ userId: "other-user" }),
      );
      await expect(
        service.create("user-1", {
          amount: 100,
          type: TransactionType.EXPENSE,
          categoryId: "cat-rent",
          dayOfMonth: 1,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it("rejects category type mismatch with 400", async () => {
      categories.findById.mockResolvedValue(
        makeCategory({ type: TransactionType.INCOME }),
      );
      await expect(
        service.create("user-1", {
          amount: 100,
          type: TransactionType.EXPENSE,
          categoryId: "cat-rent",
          dayOfMonth: 1,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects unknown category with 404", async () => {
      categories.findById.mockResolvedValue(null);
      await expect(
        service.create("user-1", {
          amount: 100,
          type: TransactionType.EXPENSE,
          categoryId: "nope",
          dayOfMonth: 1,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("update", () => {
    it("toggles active without re-validating category", async () => {
      repo.findById.mockResolvedValue(makeRecurring());
      repo.update.mockResolvedValue(makeRecurring({ active: false }));

      const result = await service.update("user-1", "rec-1", { active: false });

      expect(categories.findById).not.toHaveBeenCalled();
      expect(repo.update).toHaveBeenCalledWith(
        "rec-1",
        expect.objectContaining({ active: false }),
      );
      expect(result.active).toBe(false);
    });

    it("re-validates category when categoryId changes", async () => {
      repo.findById.mockResolvedValue(makeRecurring());
      categories.findById.mockResolvedValue(
        makeCategory({ id: "cat-other", userId: "user-1" }),
      );
      repo.update.mockResolvedValue(makeRecurring());

      await service.update("user-1", "rec-1", { categoryId: "cat-other" });
      expect(categories.findById).toHaveBeenCalledWith("cat-other");
    });

    it("rejects non-owner with 403", async () => {
      repo.findById.mockResolvedValue(
        makeRecurring({ userId: "other-user" }),
      );
      await expect(
        service.update("user-1", "rec-1", { amount: 1 }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("throws NotFoundException when missing", async () => {
      repo.findById.mockResolvedValue(null);
      await expect(
        service.update("user-1", "missing", { amount: 1 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("delete", () => {
    it("deletes owned recurring", async () => {
      repo.findById.mockResolvedValue(makeRecurring());
      await service.delete("user-1", "rec-1");
      expect(repo.delete).toHaveBeenCalledWith("rec-1");
    });

    it("rejects non-owner with 403", async () => {
      repo.findById.mockResolvedValue(
        makeRecurring({ userId: "other-user" }),
      );
      await expect(service.delete("user-1", "rec-1")).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(repo.delete).not.toHaveBeenCalled();
    });
  });

  describe("runForDate", () => {
    it("creates transactions for all active recurrings matching dayOfMonth", async () => {
      const a = makeRecurring({ id: "rec-a", amount: 8000, dayOfMonth: 5 });
      const b = makeRecurring({
        id: "rec-b",
        amount: 1200,
        dayOfMonth: 5,
        description: null,
        type: TransactionType.EXPENSE,
      });
      repo.findActiveByDayOfMonth.mockResolvedValue([a, b]);
      transactions.create.mockResolvedValue({} as never);

      const count = await service.runForDate(new Date(2026, 3, 5));

      expect(repo.findActiveByDayOfMonth).toHaveBeenCalledWith(5);
      expect(count).toBe(2);
      expect(transactions.create).toHaveBeenNthCalledWith(1, {
        userId: "user-1",
        categoryId: "cat-rent",
        amount: 8000,
        type: "EXPENSE",
        description: "ค่าเช่าคอนโด",
        source: "RECURRING",
      });
      expect(transactions.create).toHaveBeenNthCalledWith(2, {
        userId: "user-1",
        categoryId: "cat-rent",
        amount: 1200,
        type: "EXPENSE",
        description: null,
        source: "RECURRING",
      });
    });

    it("swallows per-recurring errors and continues", async () => {
      jest.spyOn(console, "error").mockImplementation(() => {});
      const a = makeRecurring({ id: "rec-a" });
      const b = makeRecurring({ id: "rec-b" });
      repo.findActiveByDayOfMonth.mockResolvedValue([a, b]);
      transactions.create
        .mockRejectedValueOnce(new Error("boom"))
        .mockResolvedValueOnce({} as never);

      const count = await service.runForDate(new Date(2026, 3, 5));
      expect(count).toBe(1);
      expect(transactions.create).toHaveBeenCalledTimes(2);
    });

    it("does nothing when no recurrings due", async () => {
      repo.findActiveByDayOfMonth.mockResolvedValue([]);
      const count = await service.runForDate(new Date(2026, 3, 5));
      expect(count).toBe(0);
      expect(transactions.create).not.toHaveBeenCalled();
    });
  });
});
