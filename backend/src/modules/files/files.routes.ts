import path from 'node:path';
import { Router } from 'express';
import { env } from '../../config/env';
import { notFound } from '../../lib/errors';
import { asyncHandler } from '../../lib/http';
import { prisma } from '../../lib/prisma';
import { authenticate } from '../../middleware/authenticate';
import { canViewApplicationDocument, canViewCleaningPhoto, canViewMaintenancePhoto } from './files.access';

export const filesRoutes = Router();
filesRoutes.use(authenticate);

filesRoutes.get('/:kind/:filename', asyncHandler(async (req, res, next) => {
  const { kind, filename } = req.params;
  if (!/^[a-zA-Z0-9._-]+$/.test(filename) || filename === '..') throw notFound();
  const filePath = `${kind}/${filename}`;
  const user = req.user!;
  let allowed = false;
  let mimeType = 'application/octet-stream';

  if (kind === 'application-documents') {
    const file = await prisma.applicationDocument.findFirst({
      where: { path: filePath },
      include: { application: { include: { room: { include: { property: true } } } } },
    });
    allowed = !!file && canViewApplicationDocument(user, file.application.tenantId, file.application.room.property.ownerId);
    if (file) mimeType = file.mimeType;
  } else if (kind === 'maintenance-photos') {
    const file = await prisma.maintenancePhoto.findFirst({
      where: { path: filePath },
      include: { request: { include: { room: { include: { property: true } } } } },
    });
    allowed = !!file && canViewMaintenancePhoto(user, file.request.tenantId, file.request.room.property.ownerId, file.request.assignedStaffId);
    if (file) mimeType = file.mimeType;
  } else if (kind === 'cleaning-photos') {
    const file = await prisma.cleaningPhoto.findFirst({
      where: { path: filePath },
      include: { task: { include: { property: true } } },
    });
    allowed = !!file && canViewCleaningPhoto(user, file.task.property.ownerId, file.task.assignedStaffId);
    if (file) mimeType = file.mimeType;
  }

  if (!allowed) throw notFound();
  res.set('Cache-Control', 'private, no-store');
  res.set('X-Content-Type-Options', 'nosniff');
  res.type(mimeType);
  res.sendFile(path.join(env.upload.dir, kind, filename), { cacheControl: false }, (error) => {
    if (error) next(error);
  });
}));
