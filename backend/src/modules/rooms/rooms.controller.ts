import type { Request, Response } from 'express';
import { audit } from '../../lib/audit';
import { asyncHandler, ok, paginated } from '../../lib/http';
import { badRequest, notFound } from '../../lib/errors';
import { roomImages } from '../../lib/images';
import { roomsService } from './rooms.service';

function filesOf(req: Request): Express.Multer.File[] {
  return Array.isArray(req.files) ? req.files : [];
}

export const roomsController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const room = await roomsService.create(req.user!.id, req.body);
    const files = filesOf(req);
    if (files.length) {
      try {
        await roomImages.add(room.id, files);
      } catch (err) {
        throw badRequest((err as Error).message);
      }
    }
    await audit({ action: 'room.create', entityType: 'Room', entityId: room.id, req });
    ok(res, await roomsService.get(req.user!.id, room.id), 201);
  }),

  addImages: asyncHandler(async (req: Request, res: Response) => {
    const files = filesOf(req);
    if (!files.length) throw badRequest('At least one image is required (field name: "images")');
    await roomsService.assertOwner(req.user!.id, req.params.id);
    try {
      await roomImages.add(req.params.id, files);
    } catch (err) {
      throw badRequest((err as Error).message);
    }
    await audit({ action: 'room.images.add', entityType: 'Room', entityId: req.params.id, req, metadata: { count: files.length } });
    ok(res, await roomsService.get(req.user!.id, req.params.id), 201);
  }),

  removeImage: asyncHandler(async (req: Request, res: Response) => {
    await roomsService.assertOwner(req.user!.id, req.params.id);
    const removed = await roomImages.remove(req.params.id, req.params.imageId);
    if (!removed) throw badRequest('Image not found on this room');
    await audit({ action: 'room.images.remove', entityType: 'Room', entityId: req.params.id, req, metadata: { imageId: req.params.imageId } });
    ok(res, await roomsService.get(req.user!.id, req.params.id));
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
