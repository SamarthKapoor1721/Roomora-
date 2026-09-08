import type { Request, Response } from 'express';
import { audit } from '../../lib/audit';
import { badRequest } from '../../lib/errors';
import { asyncHandler, ok, paginated } from '../../lib/http';
import { propertyImages } from '../../lib/images';
import { propertiesService } from './properties.service';

function filesOf(req: Request): Express.Multer.File[] {
  return Array.isArray(req.files) ? req.files : [];
}

export const propertiesController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const property = await propertiesService.create(req.user!.id, req.body);
    const files = filesOf(req);
    if (files.length) {
      try {
        await propertyImages.add(property.id, files);
      } catch (err) {
        throw badRequest((err as Error).message);
      }
    }
    await audit({ action: 'property.create', entityType: 'Property', entityId: property.id, req });
    ok(res, await propertiesService.get(req.user!.id, property.id), 201);
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

  addImages: asyncHandler(async (req: Request, res: Response) => {
    const files = filesOf(req);
    if (!files.length) throw badRequest('At least one image is required (field name: "images")');
    await propertiesService.assertOwner(req.user!.id, req.params.id);
    try {
      await propertyImages.add(req.params.id, files);
    } catch (err) {
      throw badRequest((err as Error).message);
    }
    await audit({ action: 'property.images.add', entityType: 'Property', entityId: req.params.id, req, metadata: { count: files.length } });
    ok(res, await propertiesService.get(req.user!.id, req.params.id), 201);
  }),

  removeImage: asyncHandler(async (req: Request, res: Response) => {
    await propertiesService.assertOwner(req.user!.id, req.params.id);
    const removed = await propertyImages.remove(req.params.id, req.params.imageId);
    if (!removed) throw badRequest('Image not found on this property');
    await audit({ action: 'property.images.remove', entityType: 'Property', entityId: req.params.id, req, metadata: { imageId: req.params.imageId } });
    ok(res, await propertiesService.get(req.user!.id, req.params.id));
  }),
};
