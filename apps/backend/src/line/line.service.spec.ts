import type { ConfigService } from "@nestjs/config";
import type { webhook } from "@line/bot-sdk";
import { LineService } from "./line.service";

type ReplyFn = jest.Mock<Promise<unknown>, [unknown]>;

function makeService(): { service: LineService; reply: ReplyFn } {
  const config = {
    getOrThrow: jest.fn().mockReturnValue("fake-token"),
  } as unknown as ConfigService;
  const service = new LineService(config);
  const reply: ReplyFn = jest.fn().mockResolvedValue({});
  (
    service as unknown as { client: { replyMessage: ReplyFn } }
  ).client.replyMessage = reply;
  return { service, reply };
}

function textMessageEvent(
  text: string,
  replyToken: string | undefined = "tok-1",
): webhook.Event {
  return {
    type: "message",
    timestamp: 0,
    source: { type: "user", userId: "U1" },
    mode: "active",
    webhookEventId: "evt-1",
    deliveryContext: { isRedelivery: false },
    replyToken,
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

describe("LineService", () => {
  it("echoes text messages back using replyMessage", async () => {
    const { service, reply } = makeService();

    service.processEvents([textMessageEvent("hello")]);
    await flushMicrotasks();

    expect(reply).toHaveBeenCalledTimes(1);
    expect(reply).toHaveBeenCalledWith({
      replyToken: "tok-1",
      messages: [{ type: "text", text: "ได้รับข้อความ: hello" }],
    });
  });

  it("ignores message events that are not text", async () => {
    const { service, reply } = makeService();
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
  });

  it("ignores non-message events", async () => {
    const { service, reply } = makeService();
    const event = {
      type: "follow",
      timestamp: 0,
      source: { type: "user", userId: "U1" },
      mode: "active",
      webhookEventId: "evt-3",
      deliveryContext: { isRedelivery: false },
      replyToken: "tok-3",
    } as unknown as webhook.Event;

    service.processEvents([event]);
    await flushMicrotasks();

    expect(reply).not.toHaveBeenCalled();
  });

  it("swallows handler errors so LINE webhook keeps returning 200", async () => {
    const { service, reply } = makeService();
    reply.mockRejectedValueOnce(new Error("boom"));
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
  });
});
