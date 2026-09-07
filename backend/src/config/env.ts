import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: num('PORT', 4000),
  corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim()),

  databaseUrl: required('DATABASE_URL', 'postgresql://srms:srms@localhost:5432/srms?schema=public'),

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', 'dev-access-secret'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
    accessExpires: process.env.JWT_ACCESS_EXPIRES ?? '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES ?? '7d',
  },

  upload: {
    dir: path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads'),
    maxBytes: num('MAX_UPLOAD_MB', 10) * 1024 * 1024,
  },

  ai: {
    serviceUrl: process.env.AI_SERVICE_URL ?? 'http://localhost:8001',
    timeoutMs: num('AI_SERVICE_TIMEOUT_MS', 20000),
  },
} as const;
