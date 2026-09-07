import type { Role } from '@prisma/client';
import {
  generateRefreshToken,
  hashPassword,
  hashToken,
  refreshTokenExpiry,
  signAccessToken,
  verifyPassword,
} from '../../lib/auth';
import { conflict, unauthorized } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import type { LoginInput, RegisterInput } from './auth.schema';

interface SessionMeta {
  userAgent?: string;
  ip?: string;
}

function toPublicUser(u: {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  phone: string | null;
  staffType: string | null;
}) {
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    role: u.role,
    phone: u.phone,
    staffType: u.staffType,
  };
}

async function issueSession(
  user: { id: string; email: string; role: Role; fullName: string },
  meta: SessionMeta,
) {
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.fullName,
  });
  const { token: refreshToken, tokenHash } = generateRefreshToken();
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: refreshTokenExpiry(),
      userAgent: meta.userAgent,
      ip: meta.ip,
    },
  });
  return { accessToken, refreshToken };
}

export const authService = {
  async register(input: RegisterInput, meta: SessionMeta) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw conflict('An account with this email already exists');

    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash: await hashPassword(input.password),
        fullName: input.fullName,
        phone: input.phone,
        role: input.role,
      },
    });
    const session = await issueSession(user, meta);
    return { user: toPublicUser(user), ...session };
  },

  async login(input: LoginInput, meta: SessionMeta) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !user.isActive) throw unauthorized('Invalid email or password');
    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) throw unauthorized('Invalid email or password');

    const session = await issueSession(user, meta);
    return { user: toPublicUser(user), ...session };
  },

  async refresh(refreshToken: string, meta: SessionMeta) {
    const tokenHash = hashToken(refreshToken);
    const record = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!record || record.revokedAt || record.expiresAt < new Date() || !record.user.isActive) {
      throw unauthorized('Invalid or expired refresh token');
    }

    // Rotate: revoke the used token, issue a fresh pair.
    await prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });
    const session = await issueSession(record.user, meta);
    return { user: toPublicUser(record.user), ...session };
  },

  async logout(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  async logoutAll(userId: string) {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  async me(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw unauthorized();
    return toPublicUser(user);
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw unauthorized();
    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) throw unauthorized('Current password is incorrect');
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(newPassword) },
    });
    // Invalidate all other sessions on password change.
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },
};
