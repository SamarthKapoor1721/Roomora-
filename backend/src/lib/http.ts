import type { NextFunction, Request, Response } from 'express';

/** Wrap an async route handler so thrown errors reach the error middleware. */
export function asyncHandler<
  P = Record<string, string>,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = Record<string, unknown>,
>(
  fn: (
    req: Request<P, ResBody, ReqBody, ReqQuery>,
    res: Response<ResBody>,
    next: NextFunction,
  ) => Promise<unknown>,
) {
  return (req: Request<P, ResBody, ReqBody, ReqQuery>, res: Response<ResBody>, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export function ok<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({ data });
}

export function paginated<T>(
  res: Response,
  items: T[],
  meta: { page: number; pageSize: number; total: number },
) {
  return res.json({
    data: items,
    meta: {
      ...meta,
      totalPages: Math.max(1, Math.ceil(meta.total / meta.pageSize)),
    },
  });
}
