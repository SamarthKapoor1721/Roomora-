import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../lib/auth';
import { unauthorized } from '../lib/errors';
import { prisma } from '../lib/prisma';

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
      select: { id: true, email: true, role: true, fullName: true, isActive: true },
    });
    if (!user || !user.isActive) {
      throw unauthorized('Account is inactive');
    }

    req.user = { id: user.id, email: user.email, role: user.role, fullName: user.fullName };
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
    if (user?.isActive) {
      req.user = { id: user.id, email: user.email, role: user.role, fullName: user.fullName };
    }
  } catch {
    /* ignore */
  }
  next();
}
