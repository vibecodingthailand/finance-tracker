import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { AuthRepo } from './auth.repo';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let repo: jest.Mocked<AuthRepo>;
  let jwt: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AuthRepo,
          useValue: { findByEmail: jest.fn(), findById: jest.fn(), create: jest.fn() },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('tok') },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    repo = module.get(AuthRepo);
    jwt = module.get(JwtService);
  });

  describe('register', () => {
    it('throws ConflictException when email taken', async () => {
      repo.findByEmail.mockResolvedValue({ id: '1' } as never);
      await expect(
        service.register({ email: 'a@b.com', password: 'pass1234', name: 'A' }),
      ).rejects.toThrow(ConflictException);
    });

    it('hashes password and returns token', async () => {
      repo.findByEmail.mockResolvedValue(null);
      repo.create.mockResolvedValue({ id: '1', email: 'a@b.com' } as never);
      const result = await service.register({ email: 'a@b.com', password: 'pass1234', name: 'A' });
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'a@b.com', password: expect.not.stringContaining('pass1234') }),
      );
      expect(result).toEqual({ accessToken: 'tok' });
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException when user not found', async () => {
      repo.findByEmail.mockResolvedValue(null);
      await expect(service.login({ email: 'a@b.com', password: 'pass' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException on wrong password', async () => {
      repo.findByEmail.mockResolvedValue({
        id: '1',
        password: await bcrypt.hash('correct', 10),
      } as never);
      await expect(service.login({ email: 'a@b.com', password: 'wrong' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('returns token on valid credentials', async () => {
      const hashed = await bcrypt.hash('pass1234', 10);
      repo.findByEmail.mockResolvedValue({ id: '1', email: 'a@b.com', password: hashed } as never);
      await expect(service.login({ email: 'a@b.com', password: 'pass1234' })).resolves.toEqual({
        accessToken: 'tok',
      });
    });

    it('rejects LINE-only accounts (empty password)', async () => {
      repo.findByEmail.mockResolvedValue({
        id: 'u1',
        email: 'line:Uxxx',
        password: '',
      } as never);
      await expect(
        service.login({ email: 'line:Uxxx', password: 'anything' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getProfile', () => {
    it('throws NotFoundException when user not found', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.getProfile('1')).rejects.toThrow(NotFoundException);
    });

    it('returns user profile', async () => {
      const createdAt = new Date();
      repo.findById.mockResolvedValue({
        id: '1',
        email: 'a@b.com',
        name: 'A',
        createdAt,
      } as never);
      await expect(service.getProfile('1')).resolves.toEqual({
        id: '1',
        email: 'a@b.com',
        name: 'A',
        createdAt,
      });
    });

    it('throws NotFoundException for unknown userId', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.getProfile('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('register', () => {
    it('stores a bcrypt-verifiable hash', async () => {
      repo.findByEmail.mockResolvedValue(null);
      repo.create.mockResolvedValue({ id: 'u1', email: 'a@b.com' } as never);
      await service.register({ email: 'a@b.com', password: 'pass1234', name: 'A' });
      const firstCall = repo.create.mock.calls[0];
      expect(firstCall).toBeDefined();
      const createArg = firstCall![0] as { password: string };
      expect(await bcrypt.compare('pass1234', createArg.password)).toBe(true);
    });
  });

  describe('JWT payload', () => {
    it('register calls jwtService.sign with sub and email', async () => {
      repo.findByEmail.mockResolvedValue(null);
      repo.create.mockResolvedValue({ id: 'u1', email: 'a@b.com' } as never);
      await service.register({ email: 'a@b.com', password: 'pass1234', name: 'A' });
      expect(jwt.sign).toHaveBeenCalledWith({ sub: 'u1', email: 'a@b.com' });
    });

    it('login calls jwtService.sign with sub and email', async () => {
      const hashed = await bcrypt.hash('pass1234', 10);
      repo.findByEmail.mockResolvedValue({ id: 'u2', email: 'b@c.com', password: hashed } as never);
      await service.login({ email: 'b@c.com', password: 'pass1234' });
      expect(jwt.sign).toHaveBeenCalledWith({ sub: 'u2', email: 'b@c.com' });
    });
  });
});
