import type { Request, Response } from 'express';
import { audit } from '../../lib/audit';
import { asyncHandler, ok, paginated } from '../../lib/http';
import { runWarningScan, warningsService } from './warnings.service';

export const warningsController = {
  listForOwner: asyncHandler(async (req: Request, res: Response) => {
    const { items, meta } = await warningsService.listForOwner(req.user!.id, req.query as never);
    paginated(res, items, meta);
  }),
  listForTenant: asyncHandler(async (req: Request, res: Response) => {
    const { items, meta } = await warningsService.listForTenant(req.user!.id, req.query as never);
    paginated(res, items, meta);
  }),
  createManual: asyncHandler(async (req: Request, res: Response) => {
    const warning = await warningsService.createManual(req.user!.id, req.body);
    await audit({ action: 'warning.create', entityType: 'Warning', entityId: warning.id, req });
    ok(res, warning, 201);
  }),
  updateStatus: asyncHandler(async (req: Request, res: Response) => {
    const warning = await warningsService.updateStatus(
      req.user!.id,
      req.user!.role,
      req.params.id,
      req.body.status,
    );
    await audit({ action: 'warning.status', entityType: 'Warning', entityId: req.params.id, req, metadata: { status: req.body.status } });
    ok(res, warning);
  }),
  runScan: asyncHandler(async (req: Request, res: Response) => {
    const result = await runWarningScan();
    await audit({ action: 'warning.scan', entityType: 'Warning', req, metadata: result });
    ok(res, result);
  }),
};
