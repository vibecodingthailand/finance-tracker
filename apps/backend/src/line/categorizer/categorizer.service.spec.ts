import type { ConfigService } from "@nestjs/config";
import type { Category } from "@finance-tracker/database";
import { TransactionType } from "@finance-tracker/shared";
import type { CategoriesRepository } from "../../categories/categories.repository";

const mockCreate = jest.fn();
jest.mock("@anthropic-ai/sdk", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

import { CategorizerService } from "./categorizer.service";

function makeCategory(partial: Partial<Category> & { name: string }): Category {
  return {
    id: partial.id ?? `cat-${partial.name}`,
    name: partial.name,
    icon: partial.icon ?? "📦",
    type: partial.type ?? "EXPENSE",
    userId: partial.userId ?? null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  } as Category;
}

const expenseCategories: Category[] = [
  makeCategory({ name: "อาหาร", id: "c-food" }),
  makeCategory({ name: "เดินทาง", id: "c-travel" }),
  makeCategory({ name: "อื่นๆ", id: "c-other" }),
];

const incomeCategories: Category[] = [
  makeCategory({ name: "เงินเดือน", id: "i-salary", type: "INCOME" }),
  makeCategory({ name: "รายได้อื่นๆ", id: "i-other", type: "INCOME" }),
];

function textResponse(text: string): unknown {
  return { content: [{ type: "text", text }] };
}

function makeService(): {
  service: CategorizerService;
  repo: jest.Mocked<Pick<CategoriesRepository, "findForUser">>;
} {
  const config = {
    getOrThrow: jest.fn().mockReturnValue("fake-key"),
  } as unknown as ConfigService;
  const repo = {
    findForUser: jest.fn(),
  } as unknown as jest.Mocked<Pick<CategoriesRepository, "findForUser">>;
  const service = new CategorizerService(
    config,
    repo as unknown as CategoriesRepository,
  );
  return { service, repo };
}

beforeEach(() => {
  mockCreate.mockReset();
});

describe("CategorizerService", () => {
  it("returns the category Claude picks when name matches exactly", async () => {
    const { service, repo } = makeService();
    repo.findForUser.mockResolvedValueOnce(expenseCategories);
    mockCreate.mockResolvedValueOnce(textResponse("อาหาร"));

    const result = await service.categorize({
      userId: "u1",
      description: "ข้าวมันไก่",
      type: TransactionType.EXPENSE,
    });

    expect(result).toEqual({ id: "c-food", name: "อาหาร" });
    expect(repo.findForUser).toHaveBeenCalledWith("u1", "EXPENSE");
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("falls back to อื่นๆ when Claude returns a name not in the list", async () => {
    const { service, repo } = makeService();
    repo.findForUser.mockResolvedValueOnce(expenseCategories);
    mockCreate.mockResolvedValueOnce(textResponse("ไม่รู้จัก"));

    const result = await service.categorize({
      userId: "u1",
      description: "อะไรก็ไม่รู้",
      type: TransactionType.EXPENSE,
    });

    expect(result).toEqual({ id: "c-other", name: "อื่นๆ" });
  });

  it("falls back to รายได้อื่นๆ for INCOME when no exact 'อื่นๆ' exists", async () => {
    const { service, repo } = makeService();
    repo.findForUser.mockResolvedValueOnce(incomeCategories);
    mockCreate.mockRejectedValueOnce(new Error("api down"));

    const result = await service.categorize({
      userId: "u2",
      description: "ฟรีแลนซ์",
      type: TransactionType.INCOME,
    });

    expect(result).toEqual({ id: "i-other", name: "รายได้อื่นๆ" });
  });

  it("falls back to อื่นๆ when the Claude API throws", async () => {
    const { service, repo } = makeService();
    repo.findForUser.mockResolvedValueOnce(expenseCategories);
    mockCreate.mockRejectedValueOnce(new Error("network"));

    const result = await service.categorize({
      userId: "u1",
      description: "เซเว่น",
      type: TransactionType.EXPENSE,
    });

    expect(result).toEqual({ id: "c-other", name: "อื่นๆ" });
  });

  it("caches results so the same description does not call the API twice", async () => {
    const { service, repo } = makeService();
    repo.findForUser.mockResolvedValue(expenseCategories);
    mockCreate.mockResolvedValueOnce(textResponse("อาหาร"));

    const first = await service.categorize({
      userId: "u1",
      description: "ก๋วยเตี๋ยว",
      type: TransactionType.EXPENSE,
    });
    const second = await service.categorize({
      userId: "u1",
      description: "ก๋วยเตี๋ยว",
      type: TransactionType.EXPENSE,
    });

    expect(first).toEqual(second);
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(repo.findForUser).toHaveBeenCalledTimes(1);
  });

  it("normalizes case and surrounding whitespace in cache lookups", async () => {
    const { service, repo } = makeService();
    repo.findForUser.mockResolvedValue(expenseCategories);
    mockCreate.mockResolvedValueOnce(textResponse("อาหาร"));

    await service.categorize({
      userId: "u1",
      description: "Coffee",
      type: TransactionType.EXPENSE,
    });
    await service.categorize({
      userId: "u1",
      description: "  coffee  ",
      type: TransactionType.EXPENSE,
    });

    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("uses separate cache entries per type", async () => {
    const { service, repo } = makeService();
    repo.findForUser
      .mockResolvedValueOnce(expenseCategories)
      .mockResolvedValueOnce(incomeCategories);
    mockCreate
      .mockResolvedValueOnce(textResponse("อาหาร"))
      .mockResolvedValueOnce(textResponse("เงินเดือน"));

    const expense = await service.categorize({
      userId: "u1",
      description: "งานพิเศษ",
      type: TransactionType.EXPENSE,
    });
    const income = await service.categorize({
      userId: "u1",
      description: "งานพิเศษ",
      type: TransactionType.INCOME,
    });

    expect(expense.name).toBe("อาหาร");
    expect(income.name).toBe("เงินเดือน");
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it("uses Haiku model and passes category names as choices", async () => {
    const { service, repo } = makeService();
    repo.findForUser.mockResolvedValueOnce(expenseCategories);
    mockCreate.mockResolvedValueOnce(textResponse("อาหาร"));

    await service.categorize({
      userId: "u1",
      description: "ข้าวผัด",
      type: TransactionType.EXPENSE,
    });

    const call = mockCreate.mock.calls[0][0] as {
      model: string;
      messages: { content: string }[];
    };
    expect(call.model).toBe("claude-haiku-4-5");
    const userText = call.messages[0].content;
    expect(userText).toContain("ข้าวผัด");
    expect(userText).toContain("อาหาร");
    expect(userText).toContain("เดินทาง");
    expect(userText).toContain("อื่นๆ");
  });

  it("throws when there are no categories at all for the type", async () => {
    const { service, repo } = makeService();
    repo.findForUser.mockResolvedValueOnce([]);

    await expect(
      service.categorize({
        userId: "u1",
        description: "อะไร",
        type: TransactionType.EXPENSE,
      }),
    ).rejects.toThrow();
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
