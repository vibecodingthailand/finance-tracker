import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthResponse, LoginDto, RegisterDto, UserProfile } from '@finance-tracker/shared';
import { AuthRepo } from './auth.repo';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepo: AuthRepo,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.authRepo.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }
    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.authRepo.create({ email: dto.email, name: dto.name, password: hashed });
    return { accessToken: this.jwtService.sign({ sub: user.id, email: user.email }) };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.authRepo.findByEmail(dto.email);
    if (!user || !user.password || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return { accessToken: this.jwtService.sign({ sub: user.id, email: user.email }) };
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.authRepo.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt };
  }
}
