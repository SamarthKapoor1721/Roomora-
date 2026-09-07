import type { Request, Response } from 'express';
import { audit } from '../../lib/audit';
import { badRequest } from '../../lib/errors';
import { asyncHandler, ok } from '../../lib/http';
import { authService } from './auth.service';

function meta(req: Request) {
  return { userAgent: req.get('user-agent') ?? undefined, ip: req.ip };
}

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.register(req.body, meta(req));
    await audit({ actorId: result.user.id, action: 'auth.register', entityType: 'User', entityId: result.user.id, req });
    ok(res, result, 201);
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.login(req.body, meta(req));
    await audit({ actorId: result.user.id, action: 'auth.login', entityType: 'User', entityId: result.user.id, req });
    ok(res, result);
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.refresh(req.body.refreshToken, meta(req));
    ok(res, result);
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    const token = req.body?.refreshToken;
    if (!token) throw badRequest('refreshToken is required');
    await authService.logout(token);
    ok(res, { success: true });
  }),

  logoutAll: asyncHandler(async (req: Request, res: Response) => {
    await authService.logoutAll(req.user!.id);
    await audit({ action: 'auth.logout_all', entityType: 'User', entityId: req.user!.id, req });
    ok(res, { success: true });
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    ok(res, await authService.me(req.user!.id));
  }),

  changePassword: asyncHandler(async (req: Request, res: Response) => {
    await authService.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
    await audit({ action: 'auth.change_password', entityType: 'User', entityId: req.user!.id, req });
    ok(res, { success: true });
  }),
};
