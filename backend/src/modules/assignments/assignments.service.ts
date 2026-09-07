import type { Prisma } from '@prisma/client';
import { ownerRoomOrThrow } from '../../lib/access';
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors';
import { notify } from '../../lib/notify';
import { prisma } from '../../lib/prisma';
import { effectiveFood } from '../rooms/rooms.service';

interface LeaseTerms {
  startDate: Date;
  endDate: Date;
  rentDueDay: number;
  monthlyRent?: number;
  foodOptIn?: boolean;
  terms?: string;
}

async function recomputeRoomOccupancy(tx: Prisma.TransactionClient, roomId: string) {
  const count = await tx.roomAssignment.count({ where: { roomId, isActive: true } });
  const room = await tx.room.findUnique({ where: { id: roomId } });
  if (!room) return;
  let status = room.status;
  if (status !== 'INACTIVE') {
    status = count <= 0 ? 'AVAILABLE' : count >= room.capacity ? 'FULL' : 'OCCUPIED';
  }
  await tx.room.update({
    where: { id: roomId },
    data: {
      occupantCount: count,
      status,
      // auto-close applications when full
      applicationsOpen: count >= room.capacity ? false : room.applicationsOpen,
    },
  });
}

export const assignmentsService = {
  /** Called by applications.decide on APPROVE. Runs in a transaction. */
  async assignFromApplication(
    ownerId: string,
    input: { applicationId: string; lease: LeaseTerms },
  ) {
    return prisma.$transaction(async (tx) => {
      const app = await tx.application.findUnique({
        where: { id: input.applicationId },
        include: { room: { include: { property: true } }, tenant: true },
      });
      if (!app) throw notFound('Application not found');
      if (app.room.property.ownerId !== ownerId) throw forbidden('Not your application');
      if (app.status !== 'OWNER_REVIEW' && app.status !== 'AI_COMPLETE') {
        throw conflict(`Application must be in owner review (currently ${app.status})`);
      }

      const room = app.room;
      const activeCount = await tx.roomAssignment.count({ where: { roomId: room.id, isActive: true } });
      if (activeCount >= room.capacity) throw conflict('Room is at full capacity');
      if (activeCount >= room.roommatesLimit) {
        throw conflict(`Roommate limit reached (${room.roommatesLimit})`);
      }

      const dupe = await tx.roomAssignment.findFirst({
        where: { roomId: room.id, tenantId: app.tenantId, isActive: true },
      });
      if (dupe) throw conflict('Tenant is already assigned to this room');

      const food = effectiveFood(room, room.property);
      const foodOptIn = food.foodEnabled ? (input.lease.foodOptIn ?? app.foodOptIn) : false;
      const monthlyRent = input.lease.monthlyRent ?? Number(room.monthlyRent);

      const assignment = await tx.roomAssignment.create({
        data: {
          roomId: room.id,
          tenantId: app.tenantId,
          applicationId: app.id,
          startDate: input.lease.startDate,
          endDate: input.lease.endDate,
          foodOptIn,
        },
      });

      const lease = await tx.lease.create({
        data: {
          roomId: room.id,
          tenantId: app.tenantId,
          startDate: input.lease.startDate,
          endDate: input.lease.endDate,
          monthlyRent,
          foodCharge: foodOptIn ? food.foodCharge : 0,
          securityDeposit: Number(room.securityDeposit),
          rentDueDay: input.lease.rentDueDay,
          status: 'ACTIVE',
          terms: input.lease.terms,
        },
      });

      await tx.application.update({
        where: { id: app.id },
        data: {
          status: 'APPROVED',
          decidedAt: new Date(),
          decidedById: ownerId,
          foodOptIn,
        },
      });

      // Reject any other still-active applications from this tenant for the same room
      await tx.application.updateMany({
        where: {
          tenantId: app.tenantId,
          roomId: room.id,
          id: { not: app.id },
          status: { in: ['SUBMITTED', 'DOCS_PENDING', 'UNDER_AI_REVIEW', 'AI_COMPLETE', 'OWNER_REVIEW'] },
        },
        data: { status: 'WITHDRAWN' },
      });

      await recomputeRoomOccupancy(tx, room.id);

      return { assignment, lease, roomId: room.id };
    });
  },

  /** Owner directly assigns an already-registered tenant (no application). */
  async manualAssign(
    ownerId: string,
    roomId: string,
    input: { tenantId: string; lease: LeaseTerms },
  ) {
    const room = await ownerRoomOrThrow(ownerId, roomId);
    const tenant = await prisma.user.findUnique({ where: { id: input.tenantId } });
    if (!tenant || tenant.role !== 'TENANT') throw badRequest('Target user is not a tenant');

    return prisma.$transaction(async (tx) => {
      const activeCount = await tx.roomAssignment.count({ where: { roomId, isActive: true } });
      if (activeCount >= room.capacity) throw conflict('Room is at full capacity');
      if (activeCount >= room.roommatesLimit) throw conflict(`Roommate limit reached (${room.roommatesLimit})`);
      const dupe = await tx.roomAssignment.findFirst({ where: { roomId, tenantId: input.tenantId, isActive: true } });
      if (dupe) throw conflict('Tenant already assigned to this room');

      const fullRoom = await tx.room.findUnique({ where: { id: roomId }, include: { property: true } });
      const food = effectiveFood(fullRoom!, fullRoom!.property);
      const foodOptIn = food.foodEnabled ? Boolean(input.lease.foodOptIn) : false;

      const assignment = await tx.roomAssignment.create({
        data: {
          roomId,
          tenantId: input.tenantId,
          startDate: input.lease.startDate,
          endDate: input.lease.endDate,
          foodOptIn,
        },
      });
      const lease = await tx.lease.create({
        data: {
          roomId,
          tenantId: input.tenantId,
          startDate: input.lease.startDate,
          endDate: input.lease.endDate,
          monthlyRent: input.lease.monthlyRent ?? Number(room.monthlyRent),
          foodCharge: foodOptIn ? food.foodCharge : 0,
          securityDeposit: Number(room.securityDeposit),
          rentDueDay: input.lease.rentDueDay,
          status: 'ACTIVE',
          terms: input.lease.terms,
        },
      });
      await recomputeRoomOccupancy(tx, roomId);
      await notify({
        userId: input.tenantId,
        type: 'APPLICATION_UPDATE',
        title: 'You have been assigned a room',
        body: `You were assigned to ${room.name}.`,
        relatedType: 'ROOM',
        relatedId: roomId,
      });
      return { assignment, lease };
    });
  },

  /** End a tenancy: deactivate assignment, expire lease, free the bed. */
  async endAssignment(ownerId: string, assignmentId: string, reason?: string) {
    const assignment = await prisma.roomAssignment.findUnique({
      where: { id: assignmentId },
      include: { room: { include: { property: true } } },
    });
    if (!assignment) throw notFound('Assignment not found');
    if (assignment.room.property.ownerId !== ownerId) throw forbidden('Not your room');
    if (!assignment.isActive) throw conflict('Assignment is already ended');

    return prisma.$transaction(async (tx) => {
      await tx.roomAssignment.update({
        where: { id: assignmentId },
        data: { isActive: false, endDate: new Date() },
      });
      await tx.lease.updateMany({
        where: { roomId: assignment.roomId, tenantId: assignment.tenantId, status: 'ACTIVE' },
        data: { status: 'TERMINATED' },
      });
      await recomputeRoomOccupancy(tx, assignment.roomId);
      await notify({
        userId: assignment.tenantId,
        type: 'LEASE_UPDATE',
        title: 'Tenancy ended',
        body: `Your tenancy for ${assignment.room.name} has been ended.${reason ? ` Reason: ${reason}` : ''}`,
      });
      return { success: true };
    });
  },

  async listForRoom(ownerId: string, roomId: string) {
    await ownerRoomOrThrow(ownerId, roomId);
    return prisma.roomAssignment.findMany({
      where: { roomId },
      orderBy: [{ isActive: 'desc' }, { startDate: 'desc' }],
      include: {
        tenant: { select: { id: true, fullName: true, email: true, phone: true } },
      },
    });
  },

  /** Roommates of a tenant = other active assignments in the same room(s). */
  async roommatesForTenant(tenantId: string) {
    const mine = await prisma.roomAssignment.findMany({
      where: { tenantId, isActive: true },
      select: { roomId: true },
    });
    const roomIds = mine.map((m) => m.roomId);
    if (roomIds.length === 0) return [];
    const others = await prisma.roomAssignment.findMany({
      where: { roomId: { in: roomIds }, isActive: true, tenantId: { not: tenantId } },
      include: {
        tenant: { select: { id: true, fullName: true, phone: true } },
        room: { select: { id: true, name: true } },
      },
    });
    return others.map((o) => ({
      assignmentId: o.id,
      room: o.room,
      tenant: o.tenant,
      startDate: o.startDate,
      foodOptIn: o.foodOptIn,
    }));
  },
};
