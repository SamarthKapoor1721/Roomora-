import type { Request, Response } from 'express';
import { audit } from '../../lib/audit';
import { asyncHandler, ok, paginated } from '../../lib/http';
import { leasesService } from './leases.service';

export const leasesController = {
  listForOwner: asyncHandler(async (req: Request, res: Response) => {
    const { items, meta } = await leasesService.listForOwner(req.user!.id, req.query as never);
    paginated(res, items, meta);
  }),
  getForOwner: asyncHandler(async (req: Request, res: Response) => {
    ok(res, await leasesService.getForOwner(req.user!.id, req.params.id));
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    const lease = await leasesService.update(req.user!.id, req.params.id, req.body);
    await audit({ action: 'lease.update', entityType: 'Lease', entityId: req.params.id, req, metadata: req.body });
    ok(res, lease);
  }),
  terminate: asyncHandler(async (req: Request, res: Response) => {
    await leasesService.terminate(req.user!.id, req.params.id);
    await audit({ action: 'lease.terminate', entityType: 'Lease', entityId: req.params.id, req });
    ok(res, { success: true });
  }),
  summarize: asyncHandler(async (req: Request, res: Response) => {
    ok(res, await leasesService.summarize(req.user!.id, req.params.id));
  }),
  listForTenant: asyncHandler(async (req: Request, res: Response) => {
    ok(res, await leasesService.listForTenant(req.user!.id));
  }),
  getForTenant: asyncHandler(async (req: Request, res: Response) => {
    ok(res, await leasesService.getForTenant(req.user!.id, req.params.id));
  }),
};
