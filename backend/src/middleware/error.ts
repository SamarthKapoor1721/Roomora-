import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../lib/errors';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P1001' || err.code === 'P1002' || (err.code === 'P2010' && /Server selection timeout|No available servers/i.test(err.message))) {
      return res.status(503).json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Service temporarily unavailable. Please try again shortly.' } });
    }
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: { code: 'CONFLICT', message: 'A record with these values already exists', details: err.meta },
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Record not found' } });
    }
    if (err.code === 'P2003') {
      return res.status(409).json({ error: { code: 'CONFLICT', message: 'Related record constraint failed' } });
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid query' } });
  }

  // eslint-disable-next-line no-console
  console.error('[unhandled error]', err);
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err instanceof Error
        ? err.message
        : 'Internal server error';
  res.status(500).json({ error: { code: 'INTERNAL', message } });
}
