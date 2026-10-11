import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authService } from './auth.service';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { setPasswordSchema } from './auth.schema';

vi.mock('../../lib/prisma', () => ({ prisma: {
  user: { findUnique: vi.fn(), updateMany: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
  refreshToken: { create: vi.fn() },
} }));
vi.mock('../../lib/auth', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed-password'), verifyPassword: vi.fn().mockResolvedValue(true),
  signAccessToken: vi.fn().mockReturnValue('access-token'),
  generateRefreshToken: vi.fn().mockReturnValue({ token: 'refresh-token', tokenHash: 'refresh-hash' }),
  refreshTokenExpiry: vi.fn().mockReturnValue(new Date(Date.now() + 10000)),
}));

const googleUser = {
  id: 'google-user', email: 'person@example.com', fullName: 'Test Person', role: 'TENANT' as const,
  phone: null, staffType: null, googleId: 'verified-google-id', passwordHash: null, isActive: true,
};
beforeEach(() => vi.clearAllMocks());

describe('Google backup password setup', () => {
  it('sets a password on an authenticated Google account and returns no hash', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(googleUser as never);
    vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 1 });
    const result = await authService.setPassword(googleUser.id, 'StrongPass123');
    expect(result.hasPassword).toBe(true);
    expect(result).not.toHaveProperty('passwordHash');
    expect(prisma.user.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { passwordHash: 'hashed-password' },
    }));
  });
  it('cannot overwrite an existing password without proving it', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...googleUser, passwordHash: 'existing-hash' } as never);
    await expect(authService.setPassword(googleUser.id, 'StrongPass123')).rejects.toThrow('already set');
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });
  it('refuses accounts without a Google identity', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...googleUser, googleId: null } as never);
    await expect(authService.setPassword(googleUser.id, 'StrongPass123')).rejects.toThrow('Sign in with Google');
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });
  it('refuses a disabled account', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...googleUser, isActive: false } as never);
    await expect(authService.setPassword(googleUser.id, 'StrongPass123')).rejects.toThrow();
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });
  it('does not overwrite a password saved by another concurrent request', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(googleUser as never);
    vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 0 });
    await expect(authService.setPassword(googleUser.id, 'StrongPass123')).rejects.toThrow('already set');
    expect(prisma.user.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      OR: [{ passwordHash: null }, { passwordHash: { isSet: false } }],
    }) }));
  });
  it('validates password strength before the controller runs', () => {
    for (const password of ['short', 'lowercase123', 'UPPERCASE123', 'NoNumbersHere']) {
      expect(setPasswordSchema.safeParse({ password }).success).toBe(false);
    }
    expect(setPasswordSchema.safeParse({ password: 'StrongPass123' }).success).toBe(true);
  });
  it('returns the setup flag for an account without a password', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(googleUser as never);
    expect((await authService.me(googleUser.id)).hasPassword).toBe(false);
  });
});

describe('super admin email/password login', () => {
  it('allows a configured super admin to use a valid password', async () => {
    const email = 'kapoorsammy05@gmail.com';
    const previous = [...env.superAdminEmails];
    env.superAdminEmails.push(email);
    try {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...googleUser, email, role: 'SUPER_ADMIN', passwordHash: 'existing-hash' } as never);
      const result = await authService.login({ email, password: 'StrongPass123' }, {});
      expect(result.user.role).toBe('SUPER_ADMIN');
      expect(result.user.hasPassword).toBe(true);
      expect(result.user).not.toHaveProperty('passwordHash');
    } finally { env.superAdminEmails.splice(0, env.superAdminEmails.length, ...previous); }
  });
  it('denies a super admin removed from configuration', async () => {
    const email = 'removed-admin@example.com';
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...googleUser, email, role: 'SUPER_ADMIN', passwordHash: 'existing-hash' } as never);
    await expect(authService.login({ email, password: 'StrongPass123' }, {})).rejects.toThrow('Invalid email or password');
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
  });
});
