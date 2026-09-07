import type { Request, Response } from 'express';
import { audit } from '../../lib/audit';
import { asyncHandler, ok, paginated } from '../../lib/http';
import { notFound } from '../../lib/errors';
import { roomsService } from './rooms.service';

export const roomsController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const room = await roomsService.create(req.user!.id, req.body);
    await audit({ action: 'room.create', entityType: 'Room', entityId: room.id, req });
    ok(res, room, 201);
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const { items, meta } = await roomsService.list(req.user!.id, req.query as never);
    paginated(res, items, meta);
  }),

  get: asyncHandler(async (req: Request, res: Response) => {
    ok(res, await roomsService.get(req.user!.id, req.params.id));
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const room = await roomsService.update(req.user!.id, req.params.id, req.body);
    await audit({ action: 'room.update', entityType: 'Room', entityId: room.id, req, metadata: req.body });
    ok(res, room);
  }),

  toggleApplications: asyncHandler(async (req: Request, res: Response) => {
    const room = await roomsService.setApplicationsOpen(req.user!.id, req.params.id, req.body.open);
    await audit({
      action: req.body.open ? 'room.applications_open' : 'room.applications_close',
      entityType: 'Room',
      entityId: room.id,
      req,
    });
    ok(res, room);
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await roomsService.remove(req.user!.id, req.params.id);
    await audit({ action: 'room.deactivate', entityType: 'Room', entityId: req.params.id, req });
    ok(res, { success: true });
  }),

  // tenant-facing
  browse: asyncHandler(async (req: Request, res: Response) => {
    const { items, meta } = await roomsService.browse(req.query as never);
    paginated(res, items, meta);
  }),

  browseOne: asyncHandler(async (req: Request, res: Response) => {
    const room = await roomsService.browseOne(req.params.id);
    if (!room) throw notFound('Room not found or not open for applications');
    ok(res, room);
  }),
};
