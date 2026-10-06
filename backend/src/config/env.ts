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

if (process.env.NODE_ENV === 'production') {
  for (const name of ['DATABASE_URL', 'CORS_ORIGIN', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
    required(name);
  }
  if (process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT access and refresh secrets must be different');
  }
  if (process.env.JWT_ACCESS_SECRET!.length < 32 || process.env.JWT_REFRESH_SECRET!.length < 32) {
    throw new Error('JWT secrets must be at least 32 characters');
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: num('PORT', 4000),
  corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim()),

  databaseUrl: required('DATABASE_URL'),

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
    serviceUrl: process.env.AI_SERVICE_URL ?? (process.env.AI_SERVICE_HOSTPORT ? `http://${process.env.AI_SERVICE_HOSTPORT}` : 'http://localhost:8001'),
    timeoutMs: num('AI_SERVICE_TIMEOUT_MS', 130000),
  },
} as const;
