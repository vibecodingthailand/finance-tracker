import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(__dirname, '../../../.env') });

import { PrismaClient, TransactionType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const expenseCategories: Array<{ name: string; icon: string }> = [
  { name: 'อาหาร', icon: '🍚' },
  { name: 'เดินทาง', icon: '🚗' },
  { name: 'ที่อยู่', icon: '🏠' },
  { name: 'สุขภาพ', icon: '💊' },
  { name: 'บันเทิง', icon: '🎬' },
  { name: 'การศึกษา', icon: '📚' },
  { name: 'อื่นๆ', icon: '📦' },
];

const incomeCategories: Array<{ name: string; icon: string }> = [
  { name: 'เงินเดือน', icon: '💰' },
  { name: 'โบนัส', icon: '🎁' },
  { name: 'รายได้อื่นๆ', icon: '💵' },
];

// Encodes (type, name) into a stable id so upsert can key on a single
// unique column. Postgres treats NULL as distinct in unique constraints,
// so a composite (name, type, userId) cannot guarantee idempotency for
// global rows where userId is null.
const defaultCategoryId = (type: TransactionType, name: string) =>
  `default:${type}:${name}`;

async function upsertDefaultCategory(
  name: string,
  icon: string,
  type: TransactionType,
) {
  const id = defaultCategoryId(type, name);
  await prisma.category.upsert({
    where: { id },
    create: { id, name, icon, type, userId: null },
    update: { icon, name },
  });
}

async function main() {
  for (const c of expenseCategories) {
    await upsertDefaultCategory(c.name, c.icon, TransactionType.EXPENSE);
  }
  for (const c of incomeCategories) {
    await upsertDefaultCategory(c.name, c.icon, TransactionType.INCOME);
  }
  console.log(
    `Seeded ${expenseCategories.length} expense + ${incomeCategories.length} income default categories.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
