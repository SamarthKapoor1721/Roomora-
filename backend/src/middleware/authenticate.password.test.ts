import { beforeEach, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { authenticate } from './authenticate';
import { prisma } from '../lib/prisma';

vi.mock('../lib/prisma', () => ({ prisma: { user: { findUnique: vi.fn() } } }));
vi.mock('../lib/aiClient', () => ({ aiClient: { warmup: vi.fn().mockResolvedValue(undefined) } }));
vi.mock('../lib/auth', () => ({ verifyAccessToken: vi.fn().mockReturnValue({ sub: 'test-user', email: 'person@example.com', role: 'TENANT' }) }));
const user = { id: 'test-user', email: 'person@example.com', role: 'TENANT', fullName: 'Test Person', isActive: true, googleId: 'google-subject', passwordHash: null };
beforeEach(() => vi.clearAllMocks());
async function check(path: string, hash: string | null = null) {
  vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...user, passwordHash: hash } as never);
  const next = vi.fn();
  await authenticate({ headers: { authorization: 'Bearer token' }, originalUrl: path } as Request, {} as Response, next);
  return next;
}
it('blocks workspace access until a Google account has a password', async () => {
  const next = await check('/api/v1/tenant/dashboard');
  expect(next.mock.calls[0][0].message).toContain('Set your backup password');
});
it('allows identity lookup during setup', async () => {
  expect(await check('/api/v1/auth/me')).toHaveBeenCalledWith();
});
it('allows initial password setup during setup', async () => {
  expect(await check('/api/v1/auth/set-password')).toHaveBeenCalledWith();
});
it('does not allow arbitrary routes with an auth prefix', async () => {
  const next = await check('/api/v1/auth/set-password-other');
  expect(next.mock.calls[0][0].message).toContain('Set your backup password');
});
it('allows normal access after a password is set', async () => {
  expect(await check('/api/v1/tenant/dashboard', 'stored-hash')).toHaveBeenCalledWith();
});
