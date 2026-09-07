import type { Request, Response } from 'express';
import { audit } from '../../lib/audit';
import { asyncHandler, ok, paginated } from '../../lib/http';
import { propertiesService } from './properties.service';

export const propertiesController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const property = await propertiesService.create(req.user!.id, req.body);
    await audit({ action: 'property.create', entityType: 'Property', entityId: property.id, req });
    ok(res, property, 201);
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const { items, meta } = await propertiesService.list(req.user!.id, req.query as never);
    paginated(res, items, meta);
  }),

  get: asyncHandler(async (req: Request, res: Response) => {
    ok(res, await propertiesService.get(req.user!.id, req.params.id));
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const property = await propertiesService.update(req.user!.id, req.params.id, req.body);
    await audit({ action: 'property.update', entityType: 'Property', entityId: property.id, req, metadata: req.body });
    ok(res, property);
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await propertiesService.remove(req.user!.id, req.params.id);
    await audit({ action: 'property.deactivate', entityType: 'Property', entityId: req.params.id, req });
    ok(res, { success: true });
  }),
};
