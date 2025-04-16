import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { faker } from '@faker-js/faker';
import { randomUUID } from "node:crypto";
import { createSlug } from "@/utils/create-slug";

async function seed() {
  const passwordHash = await hash("senha@1234", 6);

  console.log('Seeding database...');

  const root = await prisma.user.create({
    data: {
      name: 'Miguel Lemes',
      email: 'miguellemes005@gmail.com',
      passwordHash,
      avatarUrl: 'https://github.com/migueelzz.png',
    },
  })

  const workspace = await prisma.workspace.create({
    data: {
      avatarUrl: faker.image.avatarGitHub(),
      name: 'Personal',
      slug: createSlug('personal'),
      ownerId: root.id,
      members: {
        create: [
          {
            userId: root.id,
            role: 'ADMIN',
          },
        ],
      },
    },
  })

// Create categories based on predefined transactions
const categories = await Promise.all(
  [
    { name: "Aluguel", emoji: "🏠️" },
    { name: "Alimentação", emoji: "🍔" },
    { name: "Energia", emoji: "💡" },
    { name: "Celular", emoji: "📱" },
    { name: "Transporte", emoji: "🚌" },
    { name: "Mercado", emoji: "🛒" },
    { name: "Lazer", emoji: "🎮" },
    { name: "Farmácia", emoji: "💊" },
    { name: "Investimento", emoji: "💼" },
    { name: "Assinatura Software", emoji: "💻" },
    { name: "Educação", emoji: "🎓" },
    { name: "Café", emoji: "☕" },
  ].map((category) =>
    prisma.category.create({
      data: {
        name: category.name,
        emoji: category.emoji,
      },
    })
  )
);

// Predefined transactions
const transactions = [
  { icon: "🏠️", title: "Aluguel", date: "2025-04-01", amount: 1000 },
  { icon: "🍔", title: "Alimentação", date: "2025-04-03", amount: 320 },
  { icon: "💡", title: "Energia", date: "2025-04-05", amount: 145.9 },
  { icon: "📱", title: "Celular", date: "2025-04-06", amount: 90 },
  { icon: "🚌", title: "Transporte", date: "2025-04-07", amount: 75 },
  { icon: "🛒", title: "Mercado", date: "2025-04-08", amount: 580 },
  { icon: "🎮", title: "Lazer", date: "2025-04-09", amount: 150 },
  { icon: "💊", title: "Farmácia", date: "2025-04-10", amount: 65 },
  { icon: "💼", title: "Investimento", date: "2025-04-11", amount: 1200 },
  { icon: "💻", title: "Assinatura Software", date: "2025-04-12", amount: 89.99 },
  { icon: "🎓", title: "Educação", date: "2025-04-13", amount: 450 },
  { icon: "☕", title: "Café", date: "2025-04-14", amount: 18 },
];

// Add predefined transactions to the first workspace
for (const transaction of transactions) {
  const category = categories.find((cat) => cat.emoji === transaction.icon);

  if (!category) {
    console.error(`Category not found for transaction icon: ${transaction.icon}`);
    continue; // Skip this transaction if no matching category is found
  }

  await prisma.transaction.create({
    data: {
      amount: transaction.amount,
      type: transaction.amount > 0 ? "EXPENSE" : "INCOME",
      description: transaction.title,
      date: new Date(transaction.date),
      workspaceId: workspace.id, // Assign to the first workspace
      userId: workspace.ownerId, // Assign to the workspace owner
      categoryId: category.id, // Match category by emoji
    },
  });
}

console.log("Seeding completed!");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });