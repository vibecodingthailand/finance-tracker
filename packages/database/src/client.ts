import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function resolveUrl(connectionString?: string): string {
  const url = connectionString ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return url;
}

export function createPrismaAdapter(connectionString?: string): PrismaPg {
  return new PrismaPg({ connectionString: resolveUrl(connectionString) });
}

export function createPrismaClient(connectionString?: string): PrismaClient {
  return new PrismaClient({ adapter: createPrismaAdapter(connectionString) });
}
