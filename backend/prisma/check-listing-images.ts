import 'dotenv/config';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspect(kind: 'property' | 'room', root: string) {
  const rows = kind === 'property'
    ? await prisma.propertyImage.findMany({ select: { path: true } })
    : await prisma.roomImage.findMany({ select: { path: true } });
  let missing = 0;
  for (const row of rows) {
    const relative = row.path;
    const expectedPrefix = kind === 'property' ? 'property-images/' : 'room-images/';
    const file = path.resolve(root, relative);
    if (!relative.startsWith(expectedPrefix) || !file.startsWith(root + path.sep)) {
      console.error(`Invalid ${kind} image path in database: ${relative}`);
      missing++;
      continue;
    }
    try { await access(file); }
    catch { console.error(`Missing ${kind} image: ${relative}`); missing++; }
  }
  console.log(`${kind} images: ${rows.length} database record(s), ${missing} missing file(s)`);
  return missing;
}

async function main() {
  const root = path.resolve(process.env.UPLOAD_DIR ?? 'uploads');
  console.log(`Upload directory: ${root}`);
  const missing = await inspect('property', root) + await inspect('room', root);
  if (missing) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`Image check failed: ${error instanceof Error ? error.message : 'unknown error'}`);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
