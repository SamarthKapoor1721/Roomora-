import type { Role } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../../config/env';
import {
  generateRefreshToken,
  hashPassword,
  hashToken,
  refreshTokenExpiry,
  signAccessToken,
  verifyPassword,
} from '../../lib/auth';
import { badRequest, conflict, forbidden, unauthorized } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import type { GoogleInput, LoginInput, RegisterInput } from './auth.schema';

const googleClient = new OAuth2Client();

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
  googleId: string | null;
}) {
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    role: u.role,
    phone: u.phone,
    staffType: u.staffType,
    googleConnected: !!u.googleId,
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
    if (!user || !user.isActive || !user.passwordHash || user.role === 'SUPER_ADMIN') throw unauthorized('Invalid email or password');
    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) throw unauthorized('Invalid email or password');

    const session = await issueSession(user, meta);
    return { user: toPublicUser(user), ...session };
  },

  async google(input: GoogleInput, meta: SessionMeta) {
    if (!env.googleClientId) throw badRequest('Google sign-in is not configured');
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({ idToken: input.credential, audience: env.googleClientId });
      payload = ticket.getPayload();
    } catch {
      throw unauthorized('Invalid Google credential');
    }
    if (!payload?.sub || !payload.email || !payload.email_verified) throw unauthorized('Google email must be verified');
    const email = payload.email.toLowerCase();
    const admin = env.superAdminEmails.includes(email);
    let user = await prisma.user.findFirst({ where: { googleId: payload.sub } });
    if (user && user.email !== email) throw forbidden('Google account email has changed; contact an administrator');
    if (!user) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && !admin) throw conflict('An account with this email already exists. Sign in with its password.');
      if (existing && existing.googleId && existing.googleId !== payload.sub) throw forbidden('This email is linked to another Google account');
      if (existing && !existing.isActive) throw forbidden('This account has been disabled');
      if (existing) {
        user = await prisma.user.update({ where: { id: existing.id }, data: { googleId: payload.sub, role: 'SUPER_ADMIN' } });
        await prisma.refreshToken.updateMany({ where: { userId: existing.id, OR: [{ revokedAt: null }, { revokedAt: { isSet: false } }] }, data: { revokedAt: new Date() } });
      } else {
        user = await prisma.user.create({ data: { email, googleId: payload.sub, fullName: payload.name || email.split('@')[0], role: admin ? 'SUPER_ADMIN' : input.role } });
      }
    }
    if (!user.isActive) throw forbidden('This account has been disabled');
    if (user.role === 'SUPER_ADMIN' && !admin) throw forbidden('Administrator access is no longer configured');
    if (admin && user.role !== 'SUPER_ADMIN') {
      user = await prisma.user.update({ where: { id: user.id }, data: { role: 'SUPER_ADMIN' } });
      await prisma.refreshToken.updateMany({ where: { userId: user.id, OR: [{ revokedAt: null }, { revokedAt: { isSet: false } }] }, data: { revokedAt: new Date() } });
    }
    const session = await issueSession(user, meta);
    return { user: toPublicUser(user), ...session };
  },

  async linkGoogle(userId: string, credential: string) {
    if (!env.googleClientId) throw badRequest('Google sign-in is not configured');
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: env.googleClientId });
      payload = ticket.getPayload();
    } catch {
      throw unauthorized('Invalid Google credential');
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) throw unauthorized();
    if (!payload?.sub || !payload.email_verified || payload.email?.toLowerCase() !== user.email) throw forbidden('Use the Google account with the same email address');
    const linked = await prisma.user.findFirst({ where: { googleId: payload.sub } });
    if (linked && linked.id !== userId) throw conflict('This Google account is already linked to another user');
    if (user.googleId && user.googleId !== payload.sub) throw conflict('This account is already linked to another Google account');
    const updated = await prisma.user.update({ where: { id: userId }, data: { googleId: payload.sub } });
    return toPublicUser(updated);
  },

  async refresh(refreshToken: string, meta: SessionMeta) {
    const tokenHash = hashToken(refreshToken);
    const record = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!record || record.revokedAt || record.expiresAt < new Date() || !record.user.isActive || (record.user.role === 'SUPER_ADMIN' && !env.superAdminEmails.includes(record.user.email))) {
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
      where: { tokenHash, OR: [{ revokedAt: null }, { revokedAt: { isSet: false } }] },
      data: { revokedAt: new Date() },
    });
  },

  async logoutAll(userId: string) {
    await prisma.refreshToken.updateMany({
      where: { userId, OR: [{ revokedAt: null }, { revokedAt: { isSet: false } }] },
      data: { revokedAt: new Date() },
    });
  },

  async me(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) throw unauthorized();
    return toPublicUser(user);
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw unauthorized();
    if (!user.passwordHash) throw badRequest('This account uses Google sign-in');
    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) throw unauthorized('Current password is incorrect');
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(newPassword) },
    });
    // Invalidate all other sessions on password change.
    await prisma.refreshToken.updateMany({
      where: { userId, OR: [{ revokedAt: null }, { revokedAt: { isSet: false } }] },
      data: { revokedAt: new Date() },
    });
  },
};
