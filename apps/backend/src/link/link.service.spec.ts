import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import type { LinkCode, User } from "@finance-tracker/database";
import type { AuthRepository } from "../auth/auth.repository";
import { LinkRepository } from "./link.repository";
import { LinkService } from "./link.service";

type LinkRepoMocks = jest.Mocked<
  Pick<LinkRepository, "create" | "findByCode" | "linkLineUser">
>;

type AuthRepoMocks = jest.Mocked<Pick<AuthRepository, "findById">>;

function makeService(): {
  service: LinkService;
  repo: LinkRepoMocks;
  users: AuthRepoMocks;
} {
  const repo: LinkRepoMocks = {
    create: jest.fn(),
    findByCode: jest.fn(),
    linkLineUser: jest.fn(),
  } as unknown as LinkRepoMocks;
  const users: AuthRepoMocks = {
    findById: jest.fn(),
  } as unknown as AuthRepoMocks;
  const service = new LinkService(
    repo as unknown as LinkRepository,
    users as unknown as AuthRepository,
  );
  return { service, repo, users };
}

function makeWebUser(overrides: Partial<User> = {}): User {
  return {
    id: "web-1",
    email: "web@example.com",
    password: "hashed",
    name: "Web User",
    lineUserId: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...overrides,
  } as User;
}

function makeLineUser(overrides: Partial<User> = {}): User {
  return {
    id: "line-1",
    email: "line:U1@placeholder.local",
    password: "opaque",
    name: "LINE placeholder",
    lineUserId: "U1",
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...overrides,
  } as User;
}

function makeLinkCode(overrides: Partial<LinkCode> = {}): LinkCode {
  return {
    id: "code-1",
    code: "123456",
    userId: "web-1",
    expiresAt: new Date("2100-01-01T00:00:00.000Z"),
    usedAt: null,
    createdAt: new Date(0),
    ...overrides,
  } as LinkCode;
}

describe("LinkService", () => {
  describe("createCode", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2026-04-22T12:00:00Z"));
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it("generates a 6-digit code with a 5-minute expiry", async () => {
      const { service, repo } = makeService();
      repo.findByCode.mockResolvedValueOnce(null);
      repo.create.mockResolvedValueOnce(makeLinkCode());

      const result = await service.createCode("web-1");

      expect(result.code).toMatch(/^\d{6}$/);
      expect(new Date(result.expiresAt).getTime() - Date.now()).toBe(
        5 * 60 * 1000,
      );
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "web-1", code: result.code }),
      );
    });

    it("retries when a generated code collides with an existing row", async () => {
      const { service, repo } = makeService();
      repo.findByCode
        .mockResolvedValueOnce(makeLinkCode())
        .mockResolvedValueOnce(null);
      repo.create.mockResolvedValueOnce(makeLinkCode());

      const result = await service.createCode("web-1");

      expect(result.code).toMatch(/^\d{6}$/);
      expect(repo.findByCode).toHaveBeenCalledTimes(2);
      expect(repo.create).toHaveBeenCalledTimes(1);
    });
  });

  describe("consumeCode", () => {
    it("links when code is valid and web account has no LINE", async () => {
      const { service, repo, users } = makeService();
      repo.findByCode.mockResolvedValueOnce(makeLinkCode());
      users.findById.mockResolvedValueOnce(makeWebUser());
      repo.linkLineUser.mockResolvedValueOnce(undefined);

      const result = await service.consumeCode({
        code: "123456",
        lineUser: makeLineUser(),
      });

      expect(result.webUserId).toBe("web-1");
      expect(repo.linkLineUser).toHaveBeenCalledWith(
        expect.objectContaining({
          linkCodeId: "code-1",
          fromUserId: "line-1",
          toUserId: "web-1",
          lineUserId: "U1",
        }),
      );
    });

    it("throws NotFoundException when code does not exist", async () => {
      const { service, repo } = makeService();
      repo.findByCode.mockResolvedValueOnce(null);

      await expect(
        service.consumeCode({ code: "999999", lineUser: makeLineUser() }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws ConflictException when code was already used", async () => {
      const { service, repo } = makeService();
      repo.findByCode.mockResolvedValueOnce(
        makeLinkCode({ usedAt: new Date("2026-04-22T11:00:00Z") }),
      );

      await expect(
        service.consumeCode({ code: "123456", lineUser: makeLineUser() }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("throws BadRequestException when code is expired", async () => {
      const { service, repo } = makeService();
      repo.findByCode.mockResolvedValueOnce(
        makeLinkCode({ expiresAt: new Date("2020-01-01T00:00:00Z") }),
      );

      await expect(
        service.consumeCode({ code: "123456", lineUser: makeLineUser() }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("throws BadRequestException when LINE user is the same as the code owner", async () => {
      const { service, repo } = makeService();
      repo.findByCode.mockResolvedValueOnce(
        makeLinkCode({ userId: "line-1" }),
      );

      await expect(
        service.consumeCode({ code: "123456", lineUser: makeLineUser() }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("throws ConflictException when web account already has a LINE linked", async () => {
      const { service, repo, users } = makeService();
      repo.findByCode.mockResolvedValueOnce(makeLinkCode());
      users.findById.mockResolvedValueOnce(
        makeWebUser({ lineUserId: "Uother" }),
      );

      await expect(
        service.consumeCode({ code: "123456", lineUser: makeLineUser() }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("throws BadRequestException when LINE user is missing lineUserId", async () => {
      const { service, repo } = makeService();
      repo.findByCode.mockResolvedValueOnce(makeLinkCode());

      await expect(
        service.consumeCode({
          code: "123456",
          lineUser: makeLineUser({ lineUserId: null }),
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
