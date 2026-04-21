import type { ConfigService } from "@nestjs/config";
import type { webhook } from "@line/bot-sdk";
import type { User } from "@finance-tracker/database";
import type { AuthRepository } from "../auth/auth.repository";
import type {
  TransactionWithCategory,
  TransactionsRepository,
} from "../transactions/transactions.repository";
import type { CategorizerService } from "./categorizer/categorizer.service";
import { LineService } from "./line.service";

type ReplyFn = jest.Mock<Promise<unknown>, [unknown]>;

interface Mocks {
  users: jest.Mocked<
    Pick<AuthRepository, "findByLineUserId" | "createLineUser">
  >;
  transactions: jest.Mocked<
    Pick<
      TransactionsRepository,
      "create" | "findInRange" | "findLatestForUser" | "delete"
    >
  >;
  categorizer: jest.Mocked<Pick<CategorizerService, "categorize">>;
}

function makeService(): { service: LineService; reply: ReplyFn; mocks: Mocks } {
  const config = {
    getOrThrow: jest.fn().mockReturnValue("fake-token"),
  } as unknown as ConfigService;

  const mocks: Mocks = {
    users: {
      findByLineUserId: jest.fn(),
      createLineUser: jest.fn(),
    } as unknown as Mocks["users"],
    transactions: {
      create: jest.fn(),
      findInRange: jest.fn(),
      findLatestForUser: jest.fn(),
      delete: jest.fn(),
    } as unknown as Mocks["transactions"],
    categorizer: {
      categorize: jest.fn(),
    } as unknown as Mocks["categorizer"],
  };

  const service = new LineService(
    config,
    mocks.users as unknown as AuthRepository,
    mocks.transactions as unknown as TransactionsRepository,
    mocks.categorizer as unknown as CategorizerService,
  );

  const reply: ReplyFn = jest.fn().mockResolvedValue({});
  (
    service as unknown as { client: { replyMessage: ReplyFn } }
  ).client.replyMessage = reply;

  return { service, reply, mocks };
}

function makeUser(partial: Partial<User> = {}): User {
  return {
    id: "user-1",
    email: "line:U1@placeholder.local",
    password: "x",
    name: "LINE user",
    lineUserId: "U1",
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...partial,
  } as User;
}

function textMessageEvent(
  text: string,
  options: { replyToken?: string | undefined; lineUserId?: string } = {},
): webhook.Event {
  return {
    type: "message",
    timestamp: 0,
    source: { type: "user", userId: options.lineUserId ?? "U1" },
    mode: "active",
    webhookEventId: "evt-1",
    deliveryContext: { isRedelivery: false },
    replyToken: "replyToken" in options ? options.replyToken : "tok-1",
    message: {
      id: "msg-1",
      type: "text",
      text,
      quoteToken: "q-1",
    },
  } as unknown as webhook.Event;
}

async function flushMicrotasks(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
}

function getReplyText(reply: ReplyFn): string {
  const call = reply.mock.calls[0][0] as {
    messages: { type: string; text: string }[];
  };
  return call.messages[0].text;
}

describe("LineService", () => {
  describe("user resolution", () => {
    it("creates a new user automatically when lineUserId is unknown", async () => {
      const { service, reply, mocks } = makeService();
      mocks.users.findByLineUserId.mockResolvedValueOnce(null);
      const created = makeUser({ id: "user-new", lineUserId: "Unew" });
      mocks.users.createLineUser.mockResolvedValueOnce(created);
      mocks.categorizer.categorize.mockResolvedValueOnce({
        id: "c-food",
        name: "อาหาร",
      });
      mocks.transactions.create.mockResolvedValueOnce(
        {} as TransactionWithCategory,
      );

      service.processEvents([
        textMessageEvent("กาแฟ 65", { lineUserId: "Unew" }),
      ]);
      await flushMicrotasks();

      expect(mocks.users.findByLineUserId).toHaveBeenCalledWith("Unew");
      expect(mocks.users.createLineUser).toHaveBeenCalledWith({
        lineUserId: "Unew",
        name: expect.stringContaining("Unew"),
      });
      expect(mocks.transactions.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user-new" }),
      );
      expect(reply).toHaveBeenCalledTimes(1);
    });

    it("reuses existing user when lineUserId is already mapped", async () => {
      const { service, mocks } = makeService();
      mocks.users.findByLineUserId.mockResolvedValueOnce(makeUser());
      mocks.categorizer.categorize.mockResolvedValueOnce({
        id: "c-food",
        name: "อาหาร",
      });
      mocks.transactions.create.mockResolvedValueOnce(
        {} as TransactionWithCategory,
      );

      service.processEvents([textMessageEvent("ข้าว 50")]);
      await flushMicrotasks();

      expect(mocks.users.createLineUser).not.toHaveBeenCalled();
    });
  });

  describe("transaction recording", () => {
    it("parses expense, categorizes, saves with source LINE, and confirms", async () => {
      const { service, reply, mocks } = makeService();
      mocks.users.findByLineUserId.mockResolvedValueOnce(makeUser());
      mocks.categorizer.categorize.mockResolvedValueOnce({
        id: "c-food",
        name: "อาหาร",
      });
      mocks.transactions.create.mockResolvedValueOnce(
        {} as TransactionWithCategory,
      );

      service.processEvents([textMessageEvent("กาแฟ 65")]);
      await flushMicrotasks();

      expect(mocks.categorizer.categorize).toHaveBeenCalledWith({
        userId: "user-1",
        description: "กาแฟ",
        type: "EXPENSE",
      });
      expect(mocks.transactions.create).toHaveBeenCalledWith({
        userId: "user-1",
        categoryId: "c-food",
        amount: 65,
        type: "EXPENSE",
        description: "กาแฟ",
        source: "LINE",
      });
      expect(getReplyText(reply)).toBe("บันทึกแล้ว: กาแฟ 65.00 บาท (อาหาร)");
    });

    it("routes income prefixes to INCOME and uses รายรับ verb", async () => {
      const { service, reply, mocks } = makeService();
      mocks.users.findByLineUserId.mockResolvedValueOnce(makeUser());
      mocks.categorizer.categorize.mockResolvedValueOnce({
        id: "i-salary",
        name: "เงินเดือน",
      });
      mocks.transactions.create.mockResolvedValueOnce(
        {} as TransactionWithCategory,
      );

      service.processEvents([textMessageEvent("เงินเดือน 30000")]);
      await flushMicrotasks();

      expect(mocks.categorizer.categorize).toHaveBeenCalledWith(
        expect.objectContaining({ type: "INCOME" }),
      );
      expect(mocks.transactions.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: "INCOME", amount: 30000 }),
      );
      expect(getReplyText(reply)).toBe(
        "บันทึกรายรับแล้ว: เงินเดือน 30,000.00 บาท (เงินเดือน)",
      );
    });
  });

  describe("commands", () => {
    beforeEach(() => {
      jest.useFakeTimers({ doNotFake: ["setImmediate", "nextTick"] });
      jest.setSystemTime(new Date("2026-04-22T12:00:00+07:00"));
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it("'สรุป' sums today's income and expense", async () => {
      const { service, reply, mocks } = makeService();
      mocks.users.findByLineUserId.mockResolvedValueOnce(makeUser());
      mocks.transactions.findInRange.mockResolvedValueOnce([
        { type: "INCOME", amount: 100 },
        { type: "EXPENSE", amount: 60 },
        { type: "EXPENSE", amount: 15.5 },
      ] as unknown as TransactionWithCategory[]);

      service.processEvents([textMessageEvent("สรุป")]);
      await flushMicrotasks();

      expect(mocks.transactions.findInRange).toHaveBeenCalledTimes(1);
      const text = getReplyText(reply);
      expect(text).toContain("รายรับ: 100.00 บาท");
      expect(text).toContain("รายจ่าย: 75.50 บาท");
      expect(text).toContain("คงเหลือ: 24.50 บาท");
    });

    it("'เดือนนี้' sums the current month", async () => {
      const { service, reply, mocks } = makeService();
      mocks.users.findByLineUserId.mockResolvedValueOnce(makeUser());
      mocks.transactions.findInRange.mockResolvedValueOnce([
        { type: "INCOME", amount: 30000 },
        { type: "EXPENSE", amount: 5000 },
      ] as unknown as TransactionWithCategory[]);

      service.processEvents([textMessageEvent("เดือนนี้")]);
      await flushMicrotasks();

      const text = getReplyText(reply);
      expect(text).toContain("สรุปเดือนนี้");
      expect(text).toContain("รายรับ: 30,000.00 บาท");
      expect(text).toContain("รายจ่าย: 5,000.00 บาท");
      expect(text).toContain("คงเหลือ: 25,000.00 บาท");
    });

    it("'ยกเลิก' deletes latest transaction and confirms", async () => {
      const { service, reply, mocks } = makeService();
      mocks.users.findByLineUserId.mockResolvedValueOnce(makeUser());
      mocks.transactions.findLatestForUser.mockResolvedValueOnce({
        id: "t-last",
        type: "EXPENSE",
        amount: 120,
        description: "กาแฟ",
      } as unknown as TransactionWithCategory);
      mocks.transactions.delete.mockResolvedValueOnce(
        {} as TransactionWithCategory,
      );

      service.processEvents([textMessageEvent("ยกเลิก")]);
      await flushMicrotasks();

      expect(mocks.transactions.delete).toHaveBeenCalledWith("t-last");
      expect(getReplyText(reply)).toBe("ยกเลิกแล้ว: กาแฟ 120.00 บาท (รายจ่าย)");
    });

    it("'ยกเลิก' replies gracefully when there is nothing to delete", async () => {
      const { service, reply, mocks } = makeService();
      mocks.users.findByLineUserId.mockResolvedValueOnce(makeUser());
      mocks.transactions.findLatestForUser.mockResolvedValueOnce(null);

      service.processEvents([textMessageEvent("ยกเลิก")]);
      await flushMicrotasks();

      expect(mocks.transactions.delete).not.toHaveBeenCalled();
      expect(getReplyText(reply)).toBe("ไม่มีรายการให้ยกเลิก");
    });

    it("replies with help text when command is unknown", async () => {
      const { service, reply, mocks } = makeService();
      mocks.users.findByLineUserId.mockResolvedValueOnce(makeUser());

      service.processEvents([textMessageEvent("สวัสดี")]);
      await flushMicrotasks();

      expect(mocks.transactions.create).not.toHaveBeenCalled();
      expect(mocks.categorizer.categorize).not.toHaveBeenCalled();
      const text = getReplyText(reply);
      expect(text).toContain("วิธีใช้");
      expect(text).toContain("สรุป");
      expect(text).toContain("เดือนนี้");
      expect(text).toContain("ยกเลิก");
    });
  });

  describe("event filtering", () => {
    it("ignores non-text message events", async () => {
      const { service, reply, mocks } = makeService();
      const event = {
        type: "message",
        timestamp: 0,
        source: { type: "user", userId: "U1" },
        mode: "active",
        webhookEventId: "evt-2",
        deliveryContext: { isRedelivery: false },
        replyToken: "tok-2",
        message: { id: "msg-2", type: "image", contentProvider: { type: "line" } },
      } as unknown as webhook.Event;

      service.processEvents([event]);
      await flushMicrotasks();

      expect(reply).not.toHaveBeenCalled();
      expect(mocks.users.findByLineUserId).not.toHaveBeenCalled();
    });

    it("ignores events with no replyToken", async () => {
      const { service, reply, mocks } = makeService();

      service.processEvents([textMessageEvent("hi", { replyToken: undefined })]);
      await flushMicrotasks();

      expect(reply).not.toHaveBeenCalled();
      expect(mocks.users.findByLineUserId).not.toHaveBeenCalled();
    });

    it("swallows handler errors so the webhook still returns 200", async () => {
      const { service, reply, mocks } = makeService();
      mocks.users.findByLineUserId.mockRejectedValueOnce(new Error("boom"));
      const logError = jest
        .spyOn(
          (service as unknown as { logger: { error: (...a: unknown[]) => void } })
            .logger,
          "error",
        )
        .mockImplementation(() => undefined);

      expect(() =>
        service.processEvents([textMessageEvent("hi")]),
      ).not.toThrow();
      await flushMicrotasks();

      expect(logError).toHaveBeenCalled();
      expect(reply).not.toHaveBeenCalled();
    });
  });
});
