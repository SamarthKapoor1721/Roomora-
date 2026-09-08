import type { NextFunction, Request, Response } from 'express';
import { badRequest } from '../lib/errors';

/**
 * For multipart/form-data requests that carry their JSON payload in a single
 * text field (default: "data") alongside file uploads. Parses that field and
 * replaces req.body with the parsed object so downstream `validate({ body })`
 * sees a normal JSON body. A request that already has a plain object body
 * (no such field) is passed through untouched.
 */
export function parseJsonField(field = 'data') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const raw = req.body?.[field];
    if (raw === undefined) return next();
    if (typeof raw !== 'string') return next(badRequest(`"${field}" must be a JSON string`));
    try {
      req.body = JSON.parse(raw);
      next();
    } catch {
      next(badRequest(`"${field}" is not valid JSON`));
    }
  };
}
