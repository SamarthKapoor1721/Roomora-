import type { Prisma } from '@prisma/client';
import { aiClient } from '../../lib/aiClient';
import { forbidden, notFound } from '../../lib/errors';
import { parsePage } from '../../lib/pagination';
import { prisma } from '../../lib/prisma';

async function ownerLeaseOrThrow(ownerId: string, id: string) {
  const lease = await prisma.lease.findUnique({
    where: { id },
    include: { room: { include: { property: true } }, tenant: { select: { id: true, fullName: true, email: true } } },
  });
  if (!lease) throw notFound('Lease not found');
  if (lease.room.property.ownerId !== ownerId) throw forbidden('Not your lease');
  return lease;
}

export const leasesService = {
  async listForOwner(ownerId: string, query: Record<string, unknown>) {
    const { skip, take, page, pageSize } = parsePage(query);
    const where: Prisma.LeaseWhereInput = { room: { property: { ownerId } } };
    if (query.status) where.status = query.status as never;
    if (query.roomId) where.roomId = query.roomId as string;
    if (query.tenantId) where.tenantId = query.tenantId as string;
    if (query.expiringBefore) where.endDate = { lte: new Date(query.expiringBefore as string) };

    const [items, total] = await Promise.all([
      prisma.lease.findMany({
        where,
        skip,
        take,
        orderBy: { endDate: 'asc' },
        include: {
          tenant: { select: { id: true, fullName: true, email: true } },
          room: { select: { id: true, name: true, property: { select: { id: true, name: true } } } },
          _count: { select: { payments: true } },
        },
      }),
      prisma.lease.count({ where }),
    ]);
    return { items, meta: { page, pageSize, total } };
  },

  async getForOwner(ownerId: string, id: string) {
    await ownerLeaseOrThrow(ownerId, id);
    return prisma.lease.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, fullName: true, email: true, phone: true } },
        room: { include: { property: true } },
        payments: { orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }] },
      },
    });
  },

  async update(ownerId: string, id: string, input: Record<string, unknown>) {
    await ownerLeaseOrThrow(ownerId, id);
    return prisma.lease.update({ where: { id }, data: input as never });
  },

  async terminate(ownerId: string, id: string) {
    const lease = await ownerLeaseOrThrow(ownerId, id);
    return prisma.$transaction(async (tx) => {
      await tx.lease.update({ where: { id }, data: { status: 'TERMINATED' } });
      await tx.roomAssignment.updateMany({
        where: { roomId: lease.roomId, tenantId: lease.tenantId, isActive: true },
        data: { isActive: false, endDate: new Date() },
      });
      const count = await tx.roomAssignment.count({ where: { roomId: lease.roomId, isActive: true } });
      await tx.room.update({
        where: { id: lease.roomId },
        data: {
          occupantCount: count,
          status: count <= 0 ? 'AVAILABLE' : count >= lease.room.capacity ? 'FULL' : 'OCCUPIED',
        },
      });
      return { success: true };
    });
  },

  async summarize(ownerId: string, id: string) {
    const lease = await ownerLeaseOrThrow(ownerId, id);
    const result = await aiClient.summarizeLease({
      startDate: lease.startDate,
      endDate: lease.endDate,
      monthlyRent: Number(lease.monthlyRent),
      foodCharge: Number(lease.foodCharge),
      securityDeposit: Number(lease.securityDeposit),
      rentDueDay: lease.rentDueDay,
      terms: lease.terms ?? '',
      room: lease.room.name,
      property: lease.room.property.name,
      tenant: lease.tenant.fullName,
    });
    await prisma.lease.update({
      where: { id },
      data: { aiSummary: result.summary, aiSummarySource: result.source },
    });
    return result;
  },

  // ----- tenant -----
  async listForTenant(tenantId: string) {
    return prisma.lease.findMany({
      where: { tenantId },
      orderBy: { startDate: 'desc' },
      include: {
        room: { select: { id: true, name: true, property: { select: { name: true, city: true, addressLine1: true } } } },
      },
    });
  },

  async getForTenant(tenantId: string, id: string) {
    const lease = await prisma.lease.findFirst({
      where: { id, tenantId },
      include: {
        room: { include: { property: true } },
        payments: { orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }] },
      },
    });
    if (!lease) throw notFound('Lease not found');
    return lease;
  },
};
