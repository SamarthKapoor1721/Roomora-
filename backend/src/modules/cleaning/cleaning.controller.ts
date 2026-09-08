import type { Request, Response } from 'express';
import { audit } from '../../lib/audit';
import { badRequest } from '../../lib/errors';
import { asyncHandler, ok, paginated } from '../../lib/http';
import { relativeUploadPath } from '../../middleware/upload';
import { cleaningService } from './cleaning.service';

export const cleaningController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const task = await cleaningService.create(req.user!.id, req.body);
    await audit({ action: 'cleaning.create', entityType: 'CleaningTask', entityId: task.id, req });
    ok(res, task, 201);
  }),
  assign: asyncHandler(async (req: Request, res: Response) => {
    const task = await cleaningService.assign(req.user!.id, req.params.id, req.body.staffId);
    await audit({ action: 'cleaning.assign', entityType: 'CleaningTask', entityId: req.params.id, req, metadata: { staffId: req.body.staffId } });
    ok(res, task);
  }),
  ownerUpdate: asyncHandler(async (req: Request, res: Response) => {
    const task = await cleaningService.ownerUpdate(req.user!.id, req.params.id, req.body);
    await audit({ action: 'cleaning.owner_update', entityType: 'CleaningTask', entityId: req.params.id, req, metadata: req.body });
    ok(res, task);
  }),
  remove: asyncHandler(async (req: Request, res: Response) => {
    await cleaningService.remove(req.user!.id, req.params.id);
    await audit({ action: 'cleaning.delete', entityType: 'CleaningTask', entityId: req.params.id, req });
    ok(res, { success: true });
  }),
  listForOwner: asyncHandler(async (req: Request, res: Response) => {
    const { items, meta } = await cleaningService.listForOwner(req.user!.id, req.query as never);
    paginated(res, items, meta);
  }),
  getForOwner: asyncHandler(async (req: Request, res: Response) => {
    ok(res, await cleaningService.getForOwner(req.user!.id, req.params.id));
  }),

  listForStaff: asyncHandler(async (req: Request, res: Response) => {
    const { items, meta } = await cleaningService.listForStaff(req.user!.id, req.query as never);
    paginated(res, items, meta);
  }),
  getForStaff: asyncHandler(async (req: Request, res: Response) => {
    ok(res, await cleaningService.getForStaff(req.user!.id, req.params.id));
  }),
  staffUpdateStatus: asyncHandler(async (req: Request, res: Response) => {
    const task = await cleaningService.staffUpdateStatus(req.user!.id, req.params.id, req.body.status, req.body.notes);
    await audit({ action: 'cleaning.staff_status', entityType: 'CleaningTask', entityId: req.params.id, req, metadata: { status: req.body.status } });
    ok(res, task);
  }),
  addPhoto: asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw badRequest('A file is required (field name: "file")');
    const photo = await cleaningService.addPhoto(
      req.user!.id,
      req.params.id,
      req.file,
      req.body.kind,
      relativeUploadPath(req.file.path),
    );
    await audit({ action: 'cleaning.photo', entityType: 'CleaningPhoto', entityId: photo.id, req, metadata: { taskId: req.params.id, kind: photo.kind } });
    ok(res, photo, 201);
  }),
};
