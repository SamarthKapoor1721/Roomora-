import type { Request, Response } from 'express';
import { audit } from '../../lib/audit';
import { asyncHandler, ok, paginated } from '../../lib/http';
import { staffService } from './staff.service';

export const staffController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const staff = await staffService.create(req.user!.id, req.body);
    await audit({ action: 'staff.create', entityType: 'User', entityId: staff.id, req });
    ok(res, staff, 201);
  }),
  list: asyncHandler(async (req: Request, res: Response) => {
    const { items, meta } = await staffService.list(req.user!.id, req.query as never);
    paginated(res, items, meta);
  }),
  get: asyncHandler(async (req: Request, res: Response) => {
    ok(res, await staffService.get(req.user!.id, req.params.id));
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    const staff = await staffService.update(req.user!.id, req.params.id, req.body);
    await audit({ action: 'staff.update', entityType: 'User', entityId: req.params.id, req, metadata: req.body });
    ok(res, staff);
  }),
  deactivate: asyncHandler(async (req: Request, res: Response) => {
    await staffService.deactivate(req.user!.id, req.params.id);
    await audit({ action: 'staff.deactivate', entityType: 'User', entityId: req.params.id, req });
    ok(res, { success: true });
  }),
  myProfile: asyncHandler(async (req: Request, res: Response) => {
    ok(res, await staffService.myProfile(req.user!.id));
  }),
};
