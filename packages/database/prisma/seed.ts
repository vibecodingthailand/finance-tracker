import { PrismaClient, TransactionType } from '@prisma/client';

const prisma = new PrismaClient();

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

async function upsertDefaultCategory(
  name: string,
  icon: string,
  type: TransactionType,
) {
  const existing = await prisma.category.findFirst({
    where: { name, type, userId: null },
  });
  if (existing) {
    await prisma.category.update({
      where: { id: existing.id },
      data: { icon },
    });
  } else {
    await prisma.category.create({
      data: { name, icon, type, userId: null },
    });
  }
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
