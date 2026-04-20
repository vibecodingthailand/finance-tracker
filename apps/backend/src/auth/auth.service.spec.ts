import { ConflictException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { AuthService } from "./auth.service";
import { AuthRepository } from "./auth.repository";

type UserRow = {
  id: string;
  email: string;
  password: string;
  name: string;
  createdAt: Date;
};

function makeUser(overrides: Partial<UserRow> = {}): UserRow {
  return {
    id: "user-1",
    email: "a@b.com",
    password: "hashed",
    name: "Somsak",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("AuthService", () => {
  let service: AuthService;
  let repo: jest.Mocked<AuthRepository>;
  let jwt: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const repoMock = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      createUser: jest.fn(),
    };
    const jwtMock = { sign: jest.fn().mockReturnValue("signed.jwt.token") };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthRepository, useValue: repoMock },
        { provide: JwtService, useValue: jwtMock },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
    repo = moduleRef.get(AuthRepository);
    jwt = moduleRef.get(JwtService);
  });

  describe("register", () => {
    it("creates user with hashed password and returns token", async () => {
      repo.findByEmail.mockResolvedValue(null);
      repo.createUser.mockImplementation(async (input) =>
        makeUser({ email: input.email, name: input.name, password: input.password }),
      );

      const res = await service.register({
        email: "new@b.com",
        password: "secret-pass",
        name: "Somsak",
      });

      expect(repo.createUser).toHaveBeenCalledTimes(1);
      const created = repo.createUser.mock.calls[0][0];
      expect(created.password).not.toBe("secret-pass");
      await expect(bcrypt.compare("secret-pass", created.password)).resolves.toBe(true);
      expect(jwt.sign).toHaveBeenCalledWith({ sub: "user-1", email: "new@b.com" });
      expect(res.accessToken).toBe("signed.jwt.token");
      expect(res.user.email).toBe("new@b.com");
      expect(res.user.createdAt).toBe("2026-01-01T00:00:00.000Z");
    });

    it("throws ConflictException when email already exists", async () => {
      repo.findByEmail.mockResolvedValue(makeUser());
      await expect(
        service.register({ email: "a@b.com", password: "secret-pass", name: "x" }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repo.createUser).not.toHaveBeenCalled();
    });
  });

  describe("login", () => {
    it("returns token on valid credentials", async () => {
      const hash = await bcrypt.hash("secret-pass", 4);
      repo.findByEmail.mockResolvedValue(makeUser({ password: hash }));

      const res = await service.login({ email: "a@b.com", password: "secret-pass" });
      expect(res.accessToken).toBe("signed.jwt.token");
      expect(res.user.id).toBe("user-1");
    });

    it("rejects unknown email with UnauthorizedException", async () => {
      repo.findByEmail.mockResolvedValue(null);
      await expect(
        service.login({ email: "a@b.com", password: "secret-pass" }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("rejects wrong password with UnauthorizedException", async () => {
      const hash = await bcrypt.hash("right-password", 4);
      repo.findByEmail.mockResolvedValue(makeUser({ password: hash }));
      await expect(
        service.login({ email: "a@b.com", password: "wrong-password" }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe("getProfile", () => {
    it("returns user profile", async () => {
      repo.findById.mockResolvedValue(makeUser());
      const profile = await service.getProfile("user-1");
      expect(profile).toEqual({
        id: "user-1",
        email: "a@b.com",
        name: "Somsak",
        createdAt: "2026-01-01T00:00:00.000Z",
      });
    });

    it("throws NotFoundException when user missing", async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.getProfile("nope")).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
