import { Injectable } from "@nestjs/common";
import { User } from "@finance-tracker/database";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  createUser(input: {
    email: string;
    password: string;
    name: string;
  }): Promise<User> {
    return this.prisma.user.create({ data: input });
  }
}
