import { PrismaPg } from '@prisma/adapter-pg';

export function createAdapter() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  return new PrismaPg({ connectionString: process.env.DATABASE_URL });
}

export * from '@prisma/client';
