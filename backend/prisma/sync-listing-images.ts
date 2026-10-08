import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { mkdir, access, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';

// Copy public listing photos only. Private tenant documents are never fetched.
const prisma = new PrismaClient();
async function main() {
  const origin = new URL(process.argv[2] ?? '');
  if (!['http:', 'https:'].includes(origin.protocol)) throw new Error('Provide an HTTP(S) backend origin');
  const root = path.resolve(process.env.UPLOAD_DIR ?? 'uploads');
  const rows = await prisma.propertyImage.findMany({ select: { path: true } });
  rows.push(...await prisma.roomImage.findMany({ select: { path: true } }));
  let copied = 0;
  let failed = 0;
  for (const rel of new Set(rows.map((r) => r.path))) {
    const destination = path.resolve(root, rel);
    if (!destination.startsWith(root + path.sep) || !/^(property-images|room-images)\//.test(rel)) throw new Error('Invalid listing image path');
    try { await access(destination); continue; } catch { /* Missing locally. */ }
    try {
      const response = await fetch(new URL(`/uploads/${rel.split('/').map(encodeURIComponent).join('/')}`, origin), { signal: AbortSignal.timeout(60_000) });
      if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error(`Image fetch failed (${response.status})`);
      const bytes = Buffer.from(await response.arrayBuffer());
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination + '.sync-tmp', bytes);
      await rename(destination + '.sync-tmp', destination);
      copied++;
    } catch (error) {
      failed++;
      console.error(`Could not copy ${rel}: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }
  console.log(`Copied ${copied} missing listing photo(s); ${failed} failed.`);
  if (failed) process.exitCode = 1;
}
main().catch(() => { console.error('Image sync failed. Check the backend URL and database connection.'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
