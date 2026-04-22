import { randomBytes } from "node:crypto";
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

  findByLineUserId(lineUserId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { lineUserId } });
  }

  findAllWithLineUserId(): Promise<User[]> {
    return this.prisma.user.findMany({
      where: { lineUserId: { not: null } },
    });
  }

  createLineUser(input: {
    lineUserId: string;
    name: string;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: `line:${input.lineUserId}@placeholder.local`,
        password: randomBytes(32).toString("hex"),
        name: input.name,
        lineUserId: input.lineUserId,
      },
    });
  }

  upsertLineUser(input: {
    lineUserId: string;
    name: string;
  }): Promise<User> {
    return this.prisma.user.upsert({
      where: { lineUserId: input.lineUserId },
      update: {},
      create: {
        email: `line:${input.lineUserId}@placeholder.local`,
        password: randomBytes(32).toString("hex"),
        name: input.name,
        lineUserId: input.lineUserId,
      },
    });
  }
}
