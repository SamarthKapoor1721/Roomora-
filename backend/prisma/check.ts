import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$runCommandRaw({ ping: 1 });
  const users = await prisma.user.count();
  console.log(`MongoDB connection verified; users: ${users}.`);
}

main().catch(() => {
  console.error('MongoDB connection failed. Check DATABASE_URL, Atlas network access and database user permissions.');
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
