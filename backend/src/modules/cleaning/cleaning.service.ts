import fs from 'node:fs';
import type { Prisma } from '@prisma/client';
import { ownerPropertyOrThrow, ownerStaffOrThrow } from '../../lib/access';
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors';
import { notify } from '../../lib/notify';
import { parsePage } from '../../lib/pagination';
import { prisma } from '../../lib/prisma';

async function ownerTaskOrThrow(ownerId: string, id: string) {
  const task = await prisma.cleaningTask.findUnique({
    where: { id },
    include: { property: true, room: true, assignedStaff: true, photos: true },
  });
  if (!task) throw notFound('Cleaning task not found');
  if (task.property.ownerId !== ownerId) throw forbidden('Not your property');
  return task;
}

async function staffTaskOrThrow(staffId: string, id: string) {
  const task = await prisma.cleaningTask.findUnique({
    where: { id },
    include: { property: { select: { ownerId: true, name: true, addressLine1: true, city: true } }, room: true, photos: true },
  });
  if (!task) throw notFound('Cleaning task not found');
  if (task.assignedStaffId !== staffId) throw forbidden('This task is not assigned to you');
  return task;
}

export const cleaningService = {
  async create(
    ownerId: string,
    input: {
      propertyId: string;
      roomId?: string;
      title: string;
      description?: string;
      frequency: string;
      scheduledFor: Date;
      priority?: string;
    },
  ) {
    await ownerPropertyOrThrow(ownerId, input.propertyId);
    if (input.roomId) {
      const room = await prisma.room.findUnique({ where: { id: input.roomId } });
      if (!room || room.propertyId !== input.propertyId) throw badRequest('Room does not belong to that property');
    }
    return prisma.cleaningTask.create({
      data: {
        propertyId: input.propertyId,
        roomId: input.roomId,
        title: input.title,
        description: input.description,
        frequency: input.frequency as never,
        scheduledFor: input.scheduledFor,
        priority: (input.priority as never) ?? 'MEDIUM',
        status: 'SCHEDULED',
      },
    });
  },

  async assign(ownerId: string, id: string, staffUserId: string) {
    const task = await ownerTaskOrThrow(ownerId, id);
    if (['COMPLETED', 'MISSED'].includes(task.status)) throw conflict('Task is already closed');
    await ownerStaffOrThrow(ownerId, staffUserId);
    const updated = await prisma.cleaningTask.update({
      where: { id },
      data: {
        assignedStaffId: staffUserId,
        assignedAt: new Date(),
        status: task.status === 'SCHEDULED' ? 'ASSIGNED' : task.status,
      },
    });
    await notify({
      userId: staffUserId,
      type: 'TASK_ASSIGNED',
      title: 'New cleaning task',
      body: `You were assigned: "${task.title}" scheduled for ${task.scheduledFor.toDateString()}.`,
      relatedType: 'CLEANING',
      relatedId: id,
    });
    return updated;
  },

  async ownerUpdate(
    ownerId: string,
    id: string,
    input: { scheduledFor?: Date; priority?: string; status?: string; description?: string; title?: string },
  ) {
    await ownerTaskOrThrow(ownerId, id);
    return prisma.cleaningTask.update({ where: { id }, data: input as never });
  },

  async listForOwner(ownerId: string, query: Record<string, unknown>) {
    const { skip, take, page, pageSize } = parsePage(query);
    const where: Prisma.CleaningTaskWhereInput = { property: { ownerId } };
    if (query.status) where.status = query.status as never;
    if (query.propertyId) where.propertyId = query.propertyId as string;
    if (query.staffId) where.assignedStaffId = query.staffId as string;

    const [items, total] = await Promise.all([
      prisma.cleaningTask.findMany({
        where,
        skip,
        take,
        orderBy: [{ scheduledFor: 'asc' }],
        include: {
          property: { select: { id: true, name: true } },
          room: { select: { id: true, name: true } },
          assignedStaff: { select: { id: true, fullName: true } },
          photos: true,
        },
      }),
      prisma.cleaningTask.count({ where }),
    ]);
    return { items, meta: { page, pageSize, total } };
  },

  async getForOwner(ownerId: string, id: string) {
    return ownerTaskOrThrow(ownerId, id);
  },

  // ---------- Staff ----------
  async listForStaff(staffId: string, query: Record<string, unknown>) {
    const { skip, take, page, pageSize } = parsePage(query);
    const where: Prisma.CleaningTaskWhereInput = { assignedStaffId: staffId };
    if (query.status) where.status = query.status as never;
    else if (query.completed !== 'true') where.status = { notIn: ['COMPLETED', 'MISSED'] };

    const [items, total] = await Promise.all([
      prisma.cleaningTask.findMany({
        where,
        skip,
        take,
        orderBy: [{ scheduledFor: 'asc' }],
        include: {
          property: { select: { name: true, addressLine1: true, city: true } },
          room: { select: { name: true } },
          photos: true,
        },
      }),
      prisma.cleaningTask.count({ where }),
    ]);
    return { items, meta: { page, pageSize, total } };
  },

  async getForStaff(staffId: string, id: string) {
    return staffTaskOrThrow(staffId, id);
  },

  async staffUpdateStatus(staffId: string, id: string, status: string, notes?: string) {
    const task = await staffTaskOrThrow(staffId, id);
    const now = new Date();
    const data: Prisma.CleaningTaskUpdateInput = { status: status as never, notes: notes ?? task.notes };
    if (status === 'IN_PROGRESS' && !task.startedAt) data.startedAt = now;
    if (status === 'COMPLETED') {
      data.completedAt = now;
      const afterPhotos = task.photos.filter((p) => p.kind === 'AFTER').length;
      if (afterPhotos === 0) {
        throw badRequest('Upload at least one "AFTER" photo before marking the task complete');
      }
    }
    const updated = await prisma.cleaningTask.update({ where: { id }, data });
    await notify({
      userId: task.property.ownerId,
      type: 'CLEANING_UPDATE',
      title: 'Cleaning status changed',
      body: `"${task.title}" is now ${status}.`,
      relatedType: 'CLEANING',
      relatedId: id,
    });
    return updated;
  },

  async addPhoto(
    staffId: string,
    id: string,
    file: Express.Multer.File,
    kind: string,
    relPath: string,
  ) {
    const task = await prisma.cleaningTask.findUnique({ where: { id } });
    if (!task) {
      fs.promises.unlink(file.path).catch(() => undefined);
      throw notFound('Cleaning task not found');
    }
    if (task.assignedStaffId !== staffId) {
      fs.promises.unlink(file.path).catch(() => undefined);
      throw forbidden('This task is not assigned to you');
    }
    return prisma.cleaningPhoto.create({
      data: {
        taskId: id,
        kind: kind === 'AFTER' ? 'AFTER' : 'BEFORE',
        originalName: file.originalname,
        storedName: file.filename,
        path: relPath,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        uploadedById: staffId,
      },
    });
  },
};
