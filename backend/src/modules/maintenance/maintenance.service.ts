import fs from 'node:fs';
import type { Prisma } from '@prisma/client';
import { ownerStaffOrThrow } from '../../lib/access';
import { aiClient } from '../../lib/aiClient';
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors';
import { notify } from '../../lib/notify';
import { parsePage } from '../../lib/pagination';
import { prisma } from '../../lib/prisma';

async function ownerRequestOrThrow(ownerId: string, id: string) {
  const req = await prisma.maintenanceRequest.findUnique({
    where: { id },
    include: { room: { include: { property: true } }, tenant: true, assignedStaff: true, photos: true, notes: true },
  });
  if (!req) throw notFound('Maintenance request not found');
  if (req.room.property.ownerId !== ownerId) throw forbidden('Not your property');
  return req;
}

async function staffRequestOrThrow(staffId: string, id: string) {
  const req = await prisma.maintenanceRequest.findUnique({
    where: { id },
    include: { room: { include: { property: true } }, tenant: { select: { id: true, fullName: true } }, photos: true, notes: true },
  });
  if (!req) throw notFound('Maintenance request not found');
  if (req.assignedStaffId !== staffId) throw forbidden('This task is not assigned to you');
  return req;
}

export const maintenanceService = {
  // ---------- Tenant ----------
  async create(tenantId: string, input: { title: string; description: string }) {
    const assignment = await prisma.roomAssignment.findFirst({
      where: { tenantId, isActive: true },
      include: { room: { include: { property: true } } },
    });
    if (!assignment) throw conflict('You are not currently assigned to a room');

    const request = await prisma.maintenanceRequest.create({
      data: {
        roomId: assignment.roomId,
        tenantId,
        title: input.title,
        description: input.description,
        status: 'OPEN',
      },
    });

    // AI classification (advisory). Owner can override priority/category.
    const classification = await aiClient.classifyMaintenance({
      title: input.title,
      description: input.description,
    });
    const updated = await prisma.maintenanceRequest.update({
      where: { id: request.id },
      data: {
        category: classification.category,
        priority: classification.priority,
        aiClassification: classification as never,
        aiSource: classification.source,
      },
    });

    await notify({
      userId: assignment.room.property.ownerId,
      type: 'MAINTENANCE_UPDATE',
      title: `New maintenance request (${classification.priority})`,
      body: `${input.title} — ${assignment.room.name}. AI category: ${classification.category}.`,
      relatedType: 'MAINTENANCE',
      relatedId: request.id,
    });
    return updated;
  },

  async addPhoto(
    userId: string,
    role: string,
    id: string,
    file: Express.Multer.File,
    kind: string,
    relPath: string,
  ) {
    const request = await prisma.maintenanceRequest.findUnique({
      where: { id },
      include: { room: { include: { property: true } } },
    });
    if (!request) {
      fs.promises.unlink(file.path).catch(() => undefined);
      throw notFound('Maintenance request not found');
    }
    const isTenant = role === 'TENANT' && request.tenantId === userId;
    const isStaff = role === 'STAFF' && request.assignedStaffId === userId;
    const isOwner = role === 'OWNER' && request.room.property.ownerId === userId;
    if (!isTenant && !isStaff && !isOwner) {
      fs.promises.unlink(file.path).catch(() => undefined);
      throw forbidden('You cannot add photos to this request');
    }
    // Tenants may only add ISSUE photos; staff add BEFORE/AFTER.
    const normalizedKind = isTenant ? 'ISSUE' : kind;
    return prisma.maintenancePhoto.create({
      data: {
        requestId: id,
        kind: normalizedKind,
        originalName: file.originalname,
        storedName: file.filename,
        path: relPath,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        uploadedById: userId,
      },
    });
  },

  async listForTenant(tenantId: string, query: Record<string, unknown>) {
    const { skip, take, page, pageSize } = parsePage(query);
    const where: Prisma.MaintenanceRequestWhereInput = { tenantId };
    if (query.status) where.status = query.status as never;
    const [items, total] = await Promise.all([
      prisma.maintenanceRequest.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { room: { select: { name: true } }, photos: true, _count: { select: { notes: true } } },
      }),
      prisma.maintenanceRequest.count({ where }),
    ]);
    return { items, meta: { page, pageSize, total } };
  },

  async getForTenant(tenantId: string, id: string) {
    const req = await prisma.maintenanceRequest.findFirst({
      where: { id, tenantId },
      include: {
        room: { select: { name: true } },
        assignedStaff: { select: { id: true, fullName: true } },
        photos: true,
        notes: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!req) throw notFound('Maintenance request not found');
    return req;
  },

  // ---------- Owner ----------
  async listForOwner(ownerId: string, query: Record<string, unknown>) {
    const { skip, take, page, pageSize } = parsePage(query);
    const where: Prisma.MaintenanceRequestWhereInput = { room: { property: { ownerId } } };
    if (query.status) where.status = query.status as never;
    if (query.priority) where.priority = query.priority as never;
    if (query.roomId) where.roomId = query.roomId as string;
    if (query.staffId) where.assignedStaffId = query.staffId as string;

    const [items, total] = await Promise.all([
      prisma.maintenanceRequest.findMany({
        where,
        skip,
        take,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        include: {
          room: { select: { id: true, name: true, property: { select: { id: true, name: true } } } },
          tenant: { select: { id: true, fullName: true } },
          assignedStaff: { select: { id: true, fullName: true } },
          photos: true,
          _count: { select: { notes: true } },
        },
      }),
      prisma.maintenanceRequest.count({ where }),
    ]);
    return { items, meta: { page, pageSize, total } };
  },

  async getForOwner(ownerId: string, id: string) {
    return ownerRequestOrThrow(ownerId, id);
  },

  async assign(ownerId: string, id: string, staffUserId: string) {
    const request = await ownerRequestOrThrow(ownerId, id);
    if (['COMPLETED', 'CANCELLED'].includes(request.status)) throw conflict('Request is already closed');
    const staff = await ownerStaffOrThrow(ownerId, staffUserId);

    const updated = await prisma.maintenanceRequest.update({
      where: { id },
      data: {
        assignedStaffId: staffUserId,
        assignedAt: new Date(),
        status: request.status === 'OPEN' ? 'ASSIGNED' : request.status,
      },
    });
    await notify({
      userId: staffUserId,
      type: 'TASK_ASSIGNED',
      title: 'New maintenance task',
      body: `You were assigned: "${request.title}" (${request.priority}).`,
      relatedType: 'MAINTENANCE',
      relatedId: id,
    });
    await notify({
      userId: request.tenantId,
      type: 'MAINTENANCE_UPDATE',
      title: 'Maintenance update',
      body: `Your request "${request.title}" was assigned to ${staff.user.fullName}.`,
      relatedType: 'MAINTENANCE',
      relatedId: id,
    });
    return updated;
  },

  async ownerUpdate(
    ownerId: string,
    id: string,
    input: { priority?: string; category?: string; status?: string },
  ) {
    await ownerRequestOrThrow(ownerId, id);
    return prisma.maintenanceRequest.update({ where: { id }, data: input as never });
  },

  async addNote(userId: string, role: string, id: string, body: string) {
    const request = await prisma.maintenanceRequest.findUnique({
      where: { id },
      include: { room: { include: { property: true } } },
    });
    if (!request) throw notFound('Maintenance request not found');
    const allowed =
      (role === 'OWNER' && request.room.property.ownerId === userId) ||
      (role === 'STAFF' && request.assignedStaffId === userId) ||
      (role === 'TENANT' && request.tenantId === userId);
    if (!allowed) throw forbidden('You cannot add notes to this request');
    return prisma.maintenanceNote.create({ data: { requestId: id, authorId: userId, body } });
  },

  // ---------- Staff ----------
  async listForStaff(staffId: string, query: Record<string, unknown>) {
    const { skip, take, page, pageSize } = parsePage(query);
    const where: Prisma.MaintenanceRequestWhereInput = { assignedStaffId: staffId };
    if (query.status) where.status = query.status as never;
    else if (query.completed !== 'true') where.status = { notIn: ['COMPLETED', 'CANCELLED'] };

    const [items, total] = await Promise.all([
      prisma.maintenanceRequest.findMany({
        where,
        skip,
        take,
        orderBy: [{ priority: 'desc' }, { assignedAt: 'asc' }],
        include: {
          room: { select: { name: true, property: { select: { name: true, addressLine1: true, city: true } } } },
          tenant: { select: { fullName: true, phone: true } },
          photos: true,
          notes: { orderBy: { createdAt: 'asc' } },
        },
      }),
      prisma.maintenanceRequest.count({ where }),
    ]);
    return { items, meta: { page, pageSize, total } };
  },

  async getForStaff(staffId: string, id: string) {
    return staffRequestOrThrow(staffId, id);
  },

  async staffUpdateStatus(staffId: string, id: string, status: string, resolutionNotes?: string) {
    const request = await staffRequestOrThrow(staffId, id);
    const now = new Date();
    const data: Prisma.MaintenanceRequestUpdateInput = { status: status as never };
    if (status === 'IN_PROGRESS' && !request.startedAt) data.startedAt = now;
    if (status === 'COMPLETED') {
      data.completedAt = now;
      data.resolutionNotes = resolutionNotes ?? request.resolutionNotes;
      // Require at least one AFTER photo as proof of completion.
      const afterPhotos = request.photos.filter((p) => p.kind === 'AFTER').length;
      if (afterPhotos === 0) {
        throw badRequest('Upload at least one "AFTER" photo before marking the task complete');
      }
    }
    const updated = await prisma.maintenanceRequest.update({ where: { id }, data });

    await notify({
      userId: request.room.property.ownerId,
      type: 'MAINTENANCE_UPDATE',
      title: 'Maintenance status changed',
      body: `"${request.title}" is now ${status}.`,
      relatedType: 'MAINTENANCE',
      relatedId: id,
    });
    await notify({
      userId: request.tenantId,
      type: 'MAINTENANCE_UPDATE',
      title: 'Maintenance update',
      body: `Your request "${request.title}" is now ${status}.`,
      relatedType: 'MAINTENANCE',
      relatedId: id,
    });
    return updated;
  },
};
