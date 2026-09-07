import type { Request, Response } from 'express';
import { audit } from '../../lib/audit';
import { badRequest } from '../../lib/errors';
import { asyncHandler, ok, paginated } from '../../lib/http';
import { relativeUploadPath } from '../../middleware/upload';
import { maintenanceService } from './maintenance.service';

export const maintenanceController = {
  // tenant
  create: asyncHandler(async (req: Request, res: Response) => {
    const request = await maintenanceService.create(req.user!.id, req.body);
    await audit({ action: 'maintenance.create', entityType: 'MaintenanceRequest', entityId: request.id, req });
    ok(res, request, 201);
  }),
  listMine: asyncHandler(async (req: Request, res: Response) => {
    const { items, meta } = await maintenanceService.listForTenant(req.user!.id, req.query as never);
    paginated(res, items, meta);
  }),
  getMine: asyncHandler(async (req: Request, res: Response) => {
    ok(res, await maintenanceService.getForTenant(req.user!.id, req.params.id));
  }),

  // shared photo/note upload
  addPhoto: asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw badRequest('A file is required (field name: "file")');
    const photo = await maintenanceService.addPhoto(
      req.user!.id,
      req.user!.role,
      req.params.id,
      req.file,
      req.body.kind,
      relativeUploadPath(req.file.path),
    );
    await audit({ action: 'maintenance.photo', entityType: 'MaintenancePhoto', entityId: photo.id, req, metadata: { requestId: req.params.id, kind: photo.kind } });
    ok(res, photo, 201);
  }),
  addNote: asyncHandler(async (req: Request, res: Response) => {
    const note = await maintenanceService.addNote(req.user!.id, req.user!.role, req.params.id, req.body.body);
    ok(res, note, 201);
  }),

  // owner
  listForOwner: asyncHandler(async (req: Request, res: Response) => {
    const { items, meta } = await maintenanceService.listForOwner(req.user!.id, req.query as never);
    paginated(res, items, meta);
  }),
  getForOwner: asyncHandler(async (req: Request, res: Response) => {
    ok(res, await maintenanceService.getForOwner(req.user!.id, req.params.id));
  }),
  assign: asyncHandler(async (req: Request, res: Response) => {
    const request = await maintenanceService.assign(req.user!.id, req.params.id, req.body.staffId);
    await audit({ action: 'maintenance.assign', entityType: 'MaintenanceRequest', entityId: req.params.id, req, metadata: { staffId: req.body.staffId } });
    ok(res, request);
  }),
  ownerUpdate: asyncHandler(async (req: Request, res: Response) => {
    const request = await maintenanceService.ownerUpdate(req.user!.id, req.params.id, req.body);
    await audit({ action: 'maintenance.owner_update', entityType: 'MaintenanceRequest', entityId: req.params.id, req, metadata: req.body });
    ok(res, request);
  }),

  // staff
  listForStaff: asyncHandler(async (req: Request, res: Response) => {
    const { items, meta } = await maintenanceService.listForStaff(req.user!.id, req.query as never);
    paginated(res, items, meta);
  }),
  getForStaff: asyncHandler(async (req: Request, res: Response) => {
    ok(res, await maintenanceService.getForStaff(req.user!.id, req.params.id));
  }),
  staffUpdateStatus: asyncHandler(async (req: Request, res: Response) => {
    const request = await maintenanceService.staffUpdateStatus(
      req.user!.id,
      req.params.id,
      req.body.status,
      req.body.resolutionNotes,
    );
    await audit({ action: 'maintenance.staff_status', entityType: 'MaintenanceRequest', entityId: req.params.id, req, metadata: { status: req.body.status } });
    ok(res, request);
  }),
};
