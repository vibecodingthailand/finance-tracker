import { createPrismaClient, type Prisma } from "../src";

const prisma = createPrismaClient();

const defaultCategories: Prisma.CategoryCreateManyInput[] = [
  { name: "อาหาร", icon: "🍚", type: "EXPENSE" },
  { name: "เดินทาง", icon: "🚗", type: "EXPENSE" },
  { name: "ที่อยู่", icon: "🏠", type: "EXPENSE" },
  { name: "สุขภาพ", icon: "💊", type: "EXPENSE" },
  { name: "บันเทิง", icon: "🎬", type: "EXPENSE" },
  { name: "การศึกษา", icon: "📚", type: "EXPENSE" },
  { name: "อื่นๆ", icon: "📦", type: "EXPENSE" },
  { name: "เงินเดือน", icon: "💰", type: "INCOME" },
  { name: "โบนัส", icon: "🎁", type: "INCOME" },
  { name: "รายได้อื่นๆ", icon: "💵", type: "INCOME" },
];

async function main() {
  for (const category of defaultCategories) {
    const existing = await prisma.category.findFirst({
      where: { name: category.name, type: category.type, userId: null },
    });
    if (existing) {
      await prisma.category.update({
        where: { id: existing.id },
        data: { icon: category.icon },
      });
    } else {
      await prisma.category.create({ data: category });
    }
  }
  console.log(`Seeded ${defaultCategories.length} default categories`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
