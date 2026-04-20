import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  AuthResponse,
  LoginDto,
  RegisterDto,
  UserProfile,
} from "@finance-tracker/shared";
import { User } from "@finance-tracker/database";
import * as bcrypt from "bcrypt";
import { AuthRepository } from "./auth.repository";
import { JwtPayload } from "./jwt-payload";

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly repo: AuthRepository,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.repo.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException("อีเมลนี้ถูกใช้งานแล้ว");
    }
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.repo.createUser({
      email: dto.email,
      password: passwordHash,
      name: dto.name,
    });
    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.repo.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    }
    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) {
      throw new UnauthorizedException("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    }
    return this.buildAuthResponse(user);
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.repo.findById(userId);
    if (!user) {
      throw new NotFoundException("ไม่พบผู้ใช้");
    }
    return this.toProfile(user);
  }

  private buildAuthResponse(user: User): AuthResponse {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const accessToken = this.jwt.sign(payload);
    return { accessToken, user: this.toProfile(user) };
  }

  private toProfile(user: User): UserProfile {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
