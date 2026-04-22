import { BadRequestException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { TransactionType } from "@finance-tracker/shared";
import type { User } from "@finance-tracker/database";
import type { AuthRepository } from "../auth/auth.repository";
import type { TransactionsRepository } from "../transactions/transactions.repository";

const mockCreate = jest.fn();
class MockAPIError extends Error {
  constructor(
    readonly status: number,
    readonly type: string,
    message: string,
  ) {
    super(message);
    this.name = "APIError";
  }
}
jest.mock("@anthropic-ai/sdk", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
  APIError: MockAPIError,
}));

const mockPushMessage = jest.fn();
jest.mock("@line/bot-sdk", () => ({
  __esModule: true,
  messagingApi: {
    MessagingApiClient: jest.fn().mockImplementation(() => ({
      pushMessage: mockPushMessage,
    })),
  },
}));

import { InsightService } from "./insight.service";

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

function makeTransaction(
  overrides: Partial<TransactionRow> = {},
): TransactionRow {
  const category = overrides.category ?? makeCategory();
  return {
    id: "tx-1",
    amount: 100,
    type: category.type,
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

function textResponse(text: string): unknown {
  return { content: [{ type: "text", text }] };
}

function makeService(): {
  service: InsightService;
  transactions: jest.Mocked<
    Pick<TransactionsRepository, "findInRange">
  >;
  users: jest.Mocked<
    Pick<AuthRepository, "findById" | "findAllWithLineUserId">
  >;
} {
  const config = {
    getOrThrow: jest.fn().mockReturnValue("fake-key"),
  } as unknown as ConfigService;
  const transactions = {
    findInRange: jest.fn(),
  } as unknown as jest.Mocked<Pick<TransactionsRepository, "findInRange">>;
  const users = {
    findById: jest.fn(),
    findAllWithLineUserId: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<AuthRepository, "findById" | "findAllWithLineUserId">
  >;
  const service = new InsightService(
    config,
    transactions as unknown as TransactionsRepository,
    users as unknown as AuthRepository,
  );
  return { service, transactions, users };
}

function makeUser(partial: Partial<User> = {}): User {
  return {
    id: "user-1",
    email: "a@b.c",
    password: "x",
    name: "A",
    lineUserId: "U1",
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...partial,
  } as User;
}

beforeEach(() => {
  mockCreate.mockReset();
  mockCreate.mockResolvedValue(textResponse("💡 สรุปจาก Claude (mock)"));
  mockPushMessage.mockReset();
  mockPushMessage.mockResolvedValue({});
});

describe("InsightService", () => {
  describe("getMonthlyData – aggregation", () => {
    it("queries current month and previous month ranges", async () => {
      const { service, transactions } = makeService();
      transactions.findInRange.mockResolvedValue([]);

      await service.getMonthlyData("user-1", 4, 2026);

      expect(transactions.findInRange).toHaveBeenNthCalledWith(
        1,
        "user-1",
        new Date(2026, 3, 1, 0, 0, 0, 0),
        new Date(2026, 4, 1, 0, 0, 0, 0),
      );
      expect(transactions.findInRange).toHaveBeenNthCalledWith(
        2,
        "user-1",
        new Date(2026, 2, 1, 0, 0, 0, 0),
        new Date(2026, 3, 1, 0, 0, 0, 0),
      );
    });

    it("wraps to previous year when month is January", async () => {
      const { service, transactions } = makeService();
      transactions.findInRange.mockResolvedValue([]);

      await service.getMonthlyData("user-1", 1, 2026);

      expect(transactions.findInRange).toHaveBeenNthCalledWith(
        2,
        "user-1",
        new Date(2025, 11, 1, 0, 0, 0, 0),
        new Date(2026, 0, 1, 0, 0, 0, 0),
      );
    });

    it("aggregates totals, balance, savings rate and category breakdown", async () => {
      const { service, transactions } = makeService();
      const food = makeCategory({ id: "cat-food", name: "อาหาร", icon: "u" });
      const travel = makeCategory({
        id: "cat-travel",
        name: "เดินทาง",
        icon: "car",
      });
      const salary = makeCategory({
        id: "cat-salary",
        name: "เงินเดือน",
        icon: "wallet",
        type: TransactionType.INCOME,
      });

      transactions.findInRange.mockResolvedValueOnce([
        makeTransaction({ id: "t1", amount: 30000, category: salary }),
        makeTransaction({ id: "t2", amount: 1500, category: food }),
        makeTransaction({ id: "t3", amount: 500, category: food }),
        makeTransaction({ id: "t4", amount: 2000, category: travel }),
      ] as never);
      transactions.findInRange.mockResolvedValueOnce([] as never);

      const result = await service.getMonthlyData("user-1", 4, 2026);

      expect(result.month).toBe(4);
      expect(result.year).toBe(2026);
      expect(result.totalIncome).toBe(30000);
      expect(result.totalExpense).toBe(4000);
      expect(result.balance).toBe(26000);
      expect(result.savingsRate).toBeCloseTo(86.67, 2);
      expect(result.byCategoryIncome).toEqual([
        {
          categoryId: "cat-salary",
          name: "เงินเดือน",
          icon: "wallet",
          total: 30000,
          count: 1,
          percentage: 100,
        },
      ]);
      expect(result.byCategoryExpense).toEqual([
        {
          categoryId: "cat-food",
          name: "อาหาร",
          icon: "u",
          total: 2000,
          count: 2,
          percentage: 50,
        },
        {
          categoryId: "cat-travel",
          name: "เดินทาง",
          icon: "car",
          total: 2000,
          count: 1,
          percentage: 50,
        },
      ]);
    });

    it("returns zero savings rate when no income", async () => {
      const { service, transactions } = makeService();
      transactions.findInRange.mockResolvedValueOnce([
        makeTransaction({ amount: 500, category: makeCategory() }),
      ] as never);
      transactions.findInRange.mockResolvedValueOnce([] as never);

      const result = await service.getMonthlyData("user-1", 4, 2026);
      expect(result.totalIncome).toBe(0);
      expect(result.savingsRate).toBe(0);
      expect(result.balance).toBe(-500);
    });
  });

  describe("getMonthlyData – anomaly detection", () => {
    it("flags category with >30% increase", async () => {
      const { service, transactions } = makeService();
      const food = makeCategory({ id: "cat-food", name: "อาหาร", icon: "u" });

      transactions.findInRange.mockResolvedValueOnce([
        makeTransaction({ id: "t1", amount: 1500, category: food }),
      ] as never);
      transactions.findInRange.mockResolvedValueOnce([
        makeTransaction({ id: "t0", amount: 1000, category: food }),
      ] as never);

      const result = await service.getMonthlyData("user-1", 4, 2026);

      expect(result.anomalies).toEqual([
        {
          categoryId: "cat-food",
          name: "อาหาร",
          icon: "u",
          type: TransactionType.EXPENSE,
          previousTotal: 1000,
          currentTotal: 1500,
          changePercentage: 50,
        },
      ]);
    });

    it("does not flag category with <=30% change", async () => {
      const { service, transactions } = makeService();
      const food = makeCategory();
      transactions.findInRange.mockResolvedValueOnce([
        makeTransaction({ amount: 1300, category: food }),
      ] as never);
      transactions.findInRange.mockResolvedValueOnce([
        makeTransaction({ amount: 1000, category: food }),
      ] as never);

      const result = await service.getMonthlyData("user-1", 4, 2026);
      expect(result.anomalies).toEqual([]);
    });

    it("flags brand-new category (previous total 0) as anomaly", async () => {
      const { service, transactions } = makeService();
      const travel = makeCategory({ id: "cat-travel", name: "เดินทาง" });

      transactions.findInRange.mockResolvedValueOnce([
        makeTransaction({ amount: 500, category: travel }),
      ] as never);
      transactions.findInRange.mockResolvedValueOnce([] as never);

      const result = await service.getMonthlyData("user-1", 4, 2026);

      expect(result.anomalies).toHaveLength(1);
      expect(result.anomalies[0]).toMatchObject({
        categoryId: "cat-travel",
        previousTotal: 0,
        currentTotal: 500,
        changePercentage: 100,
      });
    });

    it("flags disappearing category (current total 0) as anomaly", async () => {
      const { service, transactions } = makeService();
      const travel = makeCategory({ id: "cat-travel", name: "เดินทาง" });

      transactions.findInRange.mockResolvedValueOnce([] as never);
      transactions.findInRange.mockResolvedValueOnce([
        makeTransaction({ amount: 800, category: travel }),
      ] as never);

      const result = await service.getMonthlyData("user-1", 4, 2026);

      expect(result.anomalies).toHaveLength(1);
      expect(result.anomalies[0]).toMatchObject({
        categoryId: "cat-travel",
        previousTotal: 800,
        currentTotal: 0,
        changePercentage: -100,
      });
    });

    it("sorts anomalies by absolute change desc", async () => {
      const { service, transactions } = makeService();
      const food = makeCategory({ id: "cat-food", name: "อาหาร" });
      const travel = makeCategory({ id: "cat-travel", name: "เดินทาง" });

      transactions.findInRange.mockResolvedValueOnce([
        makeTransaction({ id: "c1", amount: 1500, category: food }),
        makeTransaction({ id: "c2", amount: 3000, category: travel }),
      ] as never);
      transactions.findInRange.mockResolvedValueOnce([
        makeTransaction({ id: "p1", amount: 1000, category: food }),
        makeTransaction({ id: "p2", amount: 1000, category: travel }),
      ] as never);

      const result = await service.getMonthlyData("user-1", 4, 2026);

      expect(result.anomalies.map((a) => a.categoryId)).toEqual([
        "cat-travel",
        "cat-food",
      ]);
    });
  });

  describe("getMonthlyData – validation", () => {
    it("rejects invalid month with 400", async () => {
      const { service, transactions } = makeService();
      await expect(
        service.getMonthlyData("user-1", 0, 2026),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.getMonthlyData("user-1", 13, 2026),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(transactions.findInRange).not.toHaveBeenCalled();
    });

    it("rejects invalid year with 400", async () => {
      const { service } = makeService();
      await expect(
        service.getMonthlyData("user-1", 4, 1999),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("getMonthlyData – AI summary", () => {
    it("uses Claude Haiku text as summary and passes formatted data", async () => {
      const { service, transactions } = makeService();
      const food = makeCategory({ id: "cat-food", name: "อาหาร", icon: "u" });
      const salary = makeCategory({
        id: "cat-salary",
        name: "เงินเดือน",
        type: TransactionType.INCOME,
      });
      transactions.findInRange.mockResolvedValueOnce([
        makeTransaction({ amount: 30000, category: salary }),
        makeTransaction({ amount: 2000, category: food }),
      ] as never);
      transactions.findInRange.mockResolvedValueOnce([] as never);

      mockCreate.mockReset();
      mockCreate.mockResolvedValueOnce(
        textResponse(
          "เดือนนี้คุณออมได้ ฿28,000.00 ดีมาก 🎉 ลองตั้งงบอาหารไม่เกิน ฿2,500 เดือนหน้าเพื่อรักษาสมดุลนี้",
        ),
      );

      const result = await service.getMonthlyData("user-1", 4, 2026);

      expect(result.summary).toContain("฿28,000.00");
      expect(mockCreate).toHaveBeenCalledTimes(1);
      const call = mockCreate.mock.calls[0][0] as {
        model: string;
        max_tokens: number;
        system: string;
        messages: { role: string; content: string }[];
      };
      expect(call.model).toBe("claude-haiku-4-5");
      expect(call.system).toContain("ที่ปรึกษาการเงิน");
      const userPrompt = call.messages[0].content;
      expect(userPrompt).toContain("รายรับรวม: ฿30,000.00");
      expect(userPrompt).toContain("รายจ่ายรวม: ฿2,000.00");
      expect(userPrompt).toContain("อาหาร");
    });

    it("falls back to structured number-only summary when Claude API throws", async () => {
      const { service, transactions } = makeService();
      const salary = makeCategory({
        id: "cat-salary",
        name: "เงินเดือน",
        type: TransactionType.INCOME,
      });
      transactions.findInRange.mockResolvedValueOnce([
        makeTransaction({ amount: 30000, category: salary }),
        makeTransaction({ amount: 4000, category: makeCategory() }),
      ] as never);
      transactions.findInRange.mockResolvedValueOnce([] as never);

      mockCreate.mockReset();
      mockCreate.mockRejectedValueOnce(new Error("network"));

      const result = await service.getMonthlyData("user-1", 4, 2026);

      expect(result.summary).toContain("฿30,000.00");
      expect(result.summary).toContain("฿4,000.00");
      expect(result.summary).toContain("฿26,000.00");
      expect(result.summary).toMatch(/86\.67%/);
    });

    it("falls back when Claude returns empty text", async () => {
      const { service, transactions } = makeService();
      transactions.findInRange.mockResolvedValue([]);

      mockCreate.mockReset();
      mockCreate.mockResolvedValueOnce(textResponse("   "));

      const result = await service.getMonthlyData("user-1", 4, 2026);

      expect(result.summary).toContain("รายรับ ฿0.00");
      expect(result.summary).toContain("รายจ่าย ฿0.00");
    });
  });

  describe("sendMonthlyInsight", () => {
    it("skips when user has no lineUserId", async () => {
      const { service, transactions, users } = makeService();
      users.findById.mockResolvedValueOnce(makeUser({ lineUserId: null }));

      const sent = await service.sendMonthlyInsight("user-1", 4, 2026);

      expect(sent).toBe(false);
      expect(transactions.findInRange).not.toHaveBeenCalled();
      expect(mockPushMessage).not.toHaveBeenCalled();
    });

    it("skips when user is not found", async () => {
      const { service, users } = makeService();
      users.findById.mockResolvedValueOnce(null);

      const sent = await service.sendMonthlyInsight("missing", 4, 2026);

      expect(sent).toBe(false);
      expect(mockPushMessage).not.toHaveBeenCalled();
    });

    it("pushes LINE message with formatted insight to user's lineUserId", async () => {
      const { service, transactions, users } = makeService();
      users.findById.mockResolvedValueOnce(
        makeUser({ id: "user-1", lineUserId: "Uabc" }),
      );
      const food = makeCategory({ id: "cat-food", name: "อาหาร" });
      transactions.findInRange.mockResolvedValueOnce([
        makeTransaction({ amount: 2000, category: food }),
      ] as never);
      transactions.findInRange.mockResolvedValueOnce([] as never);

      const sent = await service.sendMonthlyInsight("user-1", 4, 2026);

      expect(sent).toBe(true);
      expect(mockPushMessage).toHaveBeenCalledTimes(1);
      const req = mockPushMessage.mock.calls[0][0] as {
        to: string;
        messages: { type: string; text: string }[];
      };
      expect(req.to).toBe("Uabc");
      expect(req.messages[0].type).toBe("text");
      expect(req.messages[0].text).toContain("สรุปเดือน");
      expect(req.messages[0].text).toContain("฿2,000.00");
      expect(req.messages[0].text).toContain("อาหาร");
    });

    it("truncates message over 5000 chars with ellipsis", async () => {
      const { service, transactions, users } = makeService();
      users.findById.mockResolvedValueOnce(makeUser({ lineUserId: "Uabc" }));
      transactions.findInRange.mockResolvedValue([]);

      mockCreate.mockReset();
      mockCreate.mockResolvedValueOnce(textResponse("x".repeat(6000)));

      await service.sendMonthlyInsight("user-1", 4, 2026);

      const req = mockPushMessage.mock.calls[0][0] as {
        messages: { text: string }[];
      };
      expect(req.messages[0].text.length).toBe(5000);
      expect(req.messages[0].text.endsWith("…")).toBe(true);
    });
  });

  describe("runMonthlyBroadcast", () => {
    beforeEach(() => {
      jest.useFakeTimers({ doNotFake: ["setImmediate", "nextTick"] });
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it("sends previous month insight to all users with lineUserId", async () => {
      jest.setSystemTime(new Date(2026, 3, 1, 9, 0, 0));
      const { service, transactions, users } = makeService();
      users.findAllWithLineUserId.mockResolvedValueOnce([
        makeUser({ id: "u1", lineUserId: "U1" }),
        makeUser({ id: "u2", lineUserId: "U2" }),
      ]);
      users.findById
        .mockResolvedValueOnce(makeUser({ id: "u1", lineUserId: "U1" }))
        .mockResolvedValueOnce(makeUser({ id: "u2", lineUserId: "U2" }));
      transactions.findInRange.mockResolvedValue([]);

      await service.runMonthlyBroadcast();

      expect(transactions.findInRange).toHaveBeenNthCalledWith(
        1,
        "u1",
        new Date(2026, 2, 1, 0, 0, 0, 0),
        new Date(2026, 3, 1, 0, 0, 0, 0),
      );
      expect(mockPushMessage).toHaveBeenCalledTimes(2);
      expect(
        (mockPushMessage.mock.calls[0][0] as { to: string }).to,
      ).toBe("U1");
      expect(
        (mockPushMessage.mock.calls[1][0] as { to: string }).to,
      ).toBe("U2");
    });

    it("wraps to December of previous year when running on January 1", async () => {
      jest.setSystemTime(new Date(2026, 0, 1, 9, 0, 0));
      const { service, transactions, users } = makeService();
      users.findAllWithLineUserId.mockResolvedValueOnce([
        makeUser({ id: "u1", lineUserId: "U1" }),
      ]);
      users.findById.mockResolvedValueOnce(
        makeUser({ id: "u1", lineUserId: "U1" }),
      );
      transactions.findInRange.mockResolvedValue([]);

      await service.runMonthlyBroadcast();

      expect(transactions.findInRange).toHaveBeenNthCalledWith(
        1,
        "u1",
        new Date(2025, 11, 1, 0, 0, 0, 0),
        new Date(2026, 0, 1, 0, 0, 0, 0),
      );
    });

    it("continues to remaining users after a push error", async () => {
      jest.setSystemTime(new Date(2026, 3, 1, 9, 0, 0));
      const { service, transactions, users } = makeService();
      users.findAllWithLineUserId.mockResolvedValueOnce([
        makeUser({ id: "u1", lineUserId: "U1" }),
        makeUser({ id: "u2", lineUserId: "U2" }),
      ]);
      users.findById
        .mockResolvedValueOnce(makeUser({ id: "u1", lineUserId: "U1" }))
        .mockResolvedValueOnce(makeUser({ id: "u2", lineUserId: "U2" }));
      transactions.findInRange.mockResolvedValue([]);
      mockPushMessage
        .mockRejectedValueOnce(new Error("line down"))
        .mockResolvedValueOnce({});

      jest
        .spyOn(
          (service as unknown as { logger: { error: (...a: unknown[]) => void } })
            .logger,
          "error",
        )
        .mockImplementation(() => undefined);

      await service.runMonthlyBroadcast();

      expect(mockPushMessage).toHaveBeenCalledTimes(2);
    });

    it("skips second run while the first is still in progress", async () => {
      jest.setSystemTime(new Date(2026, 3, 1, 9, 0, 0));
      const { service, transactions, users } = makeService();

      let releaseFirstFind!: (value: User[]) => void;
      users.findAllWithLineUserId.mockReturnValueOnce(
        new Promise<User[]>((resolve) => {
          releaseFirstFind = resolve;
        }),
      );
      transactions.findInRange.mockResolvedValue([]);

      const warnSpy = jest
        .spyOn(
          (service as unknown as { logger: { warn: (...a: unknown[]) => void } })
            .logger,
          "warn",
        )
        .mockImplementation(() => undefined);

      const first = service.runMonthlyBroadcast();
      await service.runMonthlyBroadcast();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("still in progress"),
      );
      expect(users.findAllWithLineUserId).toHaveBeenCalledTimes(1);

      releaseFirstFind([]);
      await first;
    });
  });

  describe("Claude error logging", () => {
    it("does not log err.message from Claude failures", async () => {
      const { service, transactions } = makeService();
      transactions.findInRange.mockResolvedValue([]);

      mockCreate.mockReset();
      mockCreate.mockRejectedValueOnce(
        new Error("sk-ant-api03-xxx-secret-hint"),
      );

      const warnSpy = jest
        .spyOn(
          (service as unknown as { logger: { warn: (...a: unknown[]) => void } })
            .logger,
          "warn",
        )
        .mockImplementation(() => undefined);

      await service.getMonthlyData("user-1", 4, 2026);

      expect(warnSpy).toHaveBeenCalledTimes(1);
      const logged = String(warnSpy.mock.calls[0][0]);
      expect(logged).not.toContain("sk-ant-api03-xxx-secret-hint");
      expect(logged).toContain("Error");
    });
  });
});
