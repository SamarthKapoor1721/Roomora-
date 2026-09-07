import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodTypeAny, type infer as ZodInfer } from 'zod';
import { badRequest } from '../lib/errors';

interface Schemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Validates and REPLACES req.body/query/params with the parsed (typed, coerced)
 * result. Unknown keys are stripped by the schemas.
 */
export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) {
        const parsed = schemas.query.parse(req.query);
        // req.query is a getter-only in Express 5; assign field-by-field for 4.
        Object.keys(req.query).forEach((k) => delete (req.query as Record<string, unknown>)[k]);
        Object.assign(req.query, parsed);
      }
      if (schemas.params) req.params = schemas.params.parse(req.params);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(
          badRequest('Validation failed', err.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          }))),
        );
      }
      next(err);
    }
  };
}

export type Infer<T extends ZodTypeAny> = ZodInfer<T>;
