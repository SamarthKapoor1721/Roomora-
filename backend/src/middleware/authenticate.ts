import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../lib/auth';
import { env } from '../config/env';
import { forbidden, unauthorized } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { aiClient } from '../lib/aiClient';

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw unauthorized('Missing bearer token');
    }
    const token = header.slice('Bearer '.length).trim();
    let claims;
    try {
      claims = verifyAccessToken(token);
    } catch {
      throw unauthorized('Invalid or expired token');
    }

    // Confirm the user still exists and is active on every request.
    const user = await prisma.user.findUnique({
      where: { id: claims.sub },
      select: { id: true, email: true, role: true, fullName: true, isActive: true, googleId: true, passwordHash: true },
    });
    if (!user || !user.isActive || claims.role !== user.role || claims.email !== user.email || (user.role === 'SUPER_ADMIN' && !env.superAdminEmails.includes(user.email))) {
      throw unauthorized('Account is inactive');
    }

    req.user = { id: user.id, email: user.email, role: user.role, fullName: user.fullName };
    void aiClient.warmup();
    const requestPath = req.originalUrl.split('?')[0];
    if (user.googleId && !user.passwordHash && !/^\/api\/v1\/auth\/(me|set-password|logout-all)$/.test(requestPath)) {
      throw forbidden('Set your backup password before entering your workspace');
    }
    next();
  } catch (err) {
    next(err);
  }
}

/** Optional auth: attaches req.user if a valid token is present, never fails. */
export async function optionalAuthenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next();
  try {
    const claims = verifyAccessToken(header.slice(7).trim());
    const user = await prisma.user.findUnique({
      where: { id: claims.sub },
      select: { id: true, email: true, role: true, fullName: true, isActive: true },
    });
    if (user?.isActive && claims.role === user.role && claims.email === user.email && (user.role !== 'SUPER_ADMIN' || env.superAdminEmails.includes(user.email))) {
      req.user = { id: user.id, email: user.email, role: user.role, fullName: user.fullName };
    }
  } catch {
    /* ignore */
  }
  next();
}
