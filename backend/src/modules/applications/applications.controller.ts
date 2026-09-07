import type { Request, Response } from 'express';
import { audit } from '../../lib/audit';
import { badRequest } from '../../lib/errors';
import { asyncHandler, ok, paginated } from '../../lib/http';
import { relativeUploadPath } from '../../middleware/upload';
import { applicationsService } from './applications.service';

export const applicationsController = {
  // ----- tenant -----
  apply: asyncHandler(async (req: Request, res: Response) => {
    const app = await applicationsService.apply(req.user!.id, req.body);
    await audit({ action: 'application.create', entityType: 'Application', entityId: app.id, req });
    ok(res, app, 201);
  }),

  updateDraft: asyncHandler(async (req: Request, res: Response) => {
    ok(res, await applicationsService.updateDraft(req.user!.id, req.params.id, req.body));
  }),

  withdraw: asyncHandler(async (req: Request, res: Response) => {
    const app = await applicationsService.withdraw(req.user!.id, req.params.id);
    await audit({ action: 'application.withdraw', entityType: 'Application', entityId: app.id, req });
    ok(res, app);
  }),

  uploadDocument: asyncHandler(async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) throw badRequest('A file is required (field name: "file")');
    const doc = await applicationsService.addDocument(
      req.user!.id,
      req.params.id,
      file,
      req.body.type,
      relativeUploadPath(file.path),
    );
    await audit({
      action: 'application.document_upload',
      entityType: 'ApplicationDocument',
      entityId: doc.id,
      req,
      metadata: { applicationId: req.params.id, type: req.body.type },
    });
    ok(res, doc, 201);
  }),

  removeDocument: asyncHandler(async (req: Request, res: Response) => {
    await applicationsService.removeDocument(req.user!.id, req.params.id, req.params.docId);
    ok(res, { success: true });
  }),

  submitForScreening: asyncHandler(async (req: Request, res: Response) => {
    const result = await applicationsService.submitForScreening(req.user!.id, req.params.id);
    await audit({ action: 'application.submit_screening', entityType: 'Application', entityId: req.params.id, req });
    ok(res, result);
  }),

  listMine: asyncHandler(async (req: Request, res: Response) => {
    const { items, meta } = await applicationsService.listForTenant(req.user!.id, req.query as never);
    paginated(res, items, meta);
  }),

  getMine: asyncHandler(async (req: Request, res: Response) => {
    ok(res, await applicationsService.getForTenant(req.user!.id, req.params.id));
  }),

  // ----- owner -----
  listForOwner: asyncHandler(async (req: Request, res: Response) => {
    const { items, meta } = await applicationsService.listForOwner(req.user!.id, req.query as never);
    paginated(res, items, meta);
  }),

  getForOwner: asyncHandler(async (req: Request, res: Response) => {
    ok(res, await applicationsService.getForOwner(req.user!.id, req.params.id));
  }),

  rerunAi: asyncHandler(async (req: Request, res: Response) => {
    const result = await applicationsService.rerunAi(req.user!.id, req.params.id);
    await audit({ action: 'application.ai_rerun', entityType: 'Application', entityId: req.params.id, req });
    ok(res, result);
  }),

  decide: asyncHandler(async (req: Request, res: Response) => {
    const result = await applicationsService.decide(req.user!.id, req.params.id, req.body);
    await audit({
      action: req.body.decision === 'APPROVE' ? 'application.approve' : 'application.reject',
      entityType: 'Application',
      entityId: req.params.id,
      req,
      metadata: { reason: req.body.reason },
    });
    ok(res, result);
  }),
};
