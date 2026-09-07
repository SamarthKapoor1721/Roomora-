import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './lib/prisma';
import { startScheduler } from './modules/warnings/scheduler';

async function main() {
  await prisma.$connect();
  const app = createApp();

  const server = app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[srms-backend] listening on http://localhost:${env.port} (${env.nodeEnv})`);
  });

  const stopScheduler = startScheduler();

  const shutdown = async (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`\n[srms-backend] ${signal} received, shutting down`);
    stopScheduler();
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[srms-backend] fatal startup error', err);
  process.exit(1);
});
