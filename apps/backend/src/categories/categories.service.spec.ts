import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { TransactionType } from "@finance-tracker/shared";
import { CategoriesService } from "./categories.service";
import { CategoriesRepository } from "./categories.repository";

type CategoryRow = {
  id: string;
  name: string;
  icon: string;
  type: TransactionType;
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function makeCategory(overrides: Partial<CategoryRow> = {}): CategoryRow {
  return {
    id: "cat-1",
    name: "อาหาร",
    icon: "utensils",
    type: TransactionType.EXPENSE,
    userId: "user-1",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("CategoriesService", () => {
  let service: CategoriesService;
  let repo: jest.Mocked<CategoriesRepository>;

  beforeEach(async () => {
    const repoMock = {
      findForUser: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      countTransactions: jest.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: CategoriesRepository, useValue: repoMock },
      ],
    }).compile();

    service = moduleRef.get(CategoriesService);
    repo = moduleRef.get(CategoriesRepository);
  });

  describe("list", () => {
    it("returns seed defaults and user's own categories", async () => {
      const seed = makeCategory({ id: "seed-1", userId: null, name: "เงินเดือน" });
      const own = makeCategory({ id: "cat-1", userId: "user-1" });
      repo.findForUser.mockResolvedValue([seed, own]);

      const result = await service.list("user-1");

      expect(repo.findForUser).toHaveBeenCalledWith("user-1", undefined);
      expect(result).toEqual([
        {
          id: "seed-1",
          name: "เงินเดือน",
          icon: "utensils",
          type: TransactionType.EXPENSE,
          userId: null,
        },
        {
          id: "cat-1",
          name: "อาหาร",
          icon: "utensils",
          type: TransactionType.EXPENSE,
          userId: "user-1",
        },
      ]);
    });

    it("forwards type filter to repository", async () => {
      repo.findForUser.mockResolvedValue([]);
      await service.list("user-1", TransactionType.INCOME);
      expect(repo.findForUser).toHaveBeenCalledWith("user-1", "INCOME");
    });
  });

  describe("create", () => {
    it("creates category with userId from token", async () => {
      repo.create.mockImplementation(async (input) =>
        makeCategory({ ...input, id: "new-cat" }),
      );

      const result = await service.create("user-1", {
        name: "ค่าเดินทาง",
        icon: "car",
        type: TransactionType.EXPENSE,
      });

      expect(repo.create).toHaveBeenCalledWith({
        name: "ค่าเดินทาง",
        icon: "car",
        type: "EXPENSE",
        userId: "user-1",
      });
      expect(result.userId).toBe("user-1");
      expect(result.id).toBe("new-cat");
    });
  });

  describe("update", () => {
    it("updates owned category", async () => {
      repo.findById.mockResolvedValue(makeCategory());
      repo.update.mockResolvedValue(
        makeCategory({ name: "อาหารเย็น", icon: "dinner" }),
      );

      const result = await service.update("user-1", "cat-1", {
        name: "อาหารเย็น",
        icon: "dinner",
      });

      expect(repo.update).toHaveBeenCalledWith("cat-1", {
        name: "อาหารเย็น",
        icon: "dinner",
      });
      expect(result.name).toBe("อาหารเย็น");
    });

    it("rejects editing seed default (userId=null) with 403", async () => {
      repo.findById.mockResolvedValue(makeCategory({ userId: null }));
      await expect(
        service.update("user-1", "cat-1", { name: "x" }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it("rejects editing another user's category with 403", async () => {
      repo.findById.mockResolvedValue(makeCategory({ userId: "other-user" }));
      await expect(
        service.update("user-1", "cat-1", { name: "x" }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("throws NotFoundException when category missing", async () => {
      repo.findById.mockResolvedValue(null);
      await expect(
        service.update("user-1", "missing", { name: "x" }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("delete", () => {
    it("deletes owned category when no transactions reference it", async () => {
      repo.findById.mockResolvedValue(makeCategory());
      repo.countTransactions.mockResolvedValue(0);
      repo.delete.mockResolvedValue(makeCategory());

      await service.delete("user-1", "cat-1");

      expect(repo.delete).toHaveBeenCalledWith("cat-1");
    });

    it("rejects deleting seed default with 403", async () => {
      repo.findById.mockResolvedValue(makeCategory({ userId: null }));
      await expect(service.delete("user-1", "cat-1")).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(repo.delete).not.toHaveBeenCalled();
    });

    it("rejects deleting another user's category with 403", async () => {
      repo.findById.mockResolvedValue(makeCategory({ userId: "other-user" }));
      await expect(service.delete("user-1", "cat-1")).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("returns 409 Conflict when transactions reference category", async () => {
      repo.findById.mockResolvedValue(makeCategory());
      repo.countTransactions.mockResolvedValue(3);

      await expect(service.delete("user-1", "cat-1")).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(repo.delete).not.toHaveBeenCalled();
    });

    it("throws NotFoundException when category missing", async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.delete("user-1", "missing")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
