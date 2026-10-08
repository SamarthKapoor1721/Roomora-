import type { Prisma } from '@prisma/client';
import { badRequest, conflict, notFound } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { effectiveFood } from '../rooms/rooms.service';

const include = {
  tenant: { select: { fullName: true } },
  assignment: { include: { room: { include: { property: { select: { name: true } } } } } },
  targetRoom: { include: { property: { select: { name: true } } } },
} satisfies Prisma.TenancyRequestInclude;

async function refreshRoom(tx: Prisma.TransactionClient, id: string) {
  const room = await tx.room.findUniqueOrThrow({ where: { id } });
  const count = await tx.roomAssignment.count({ where: { roomId: id, isActive: true } });
  await tx.room.update({ where: { id }, data: {
    occupantCount: count,
    status: room.status === 'INACTIVE' ? 'INACTIVE' : count === 0 ? 'AVAILABLE' : count >= room.capacity ? 'FULL' : 'OCCUPIED',
    applicationsOpen: count >= Math.min(room.capacity, room.roommatesLimit) ? false : room.applicationsOpen,
  } });
}

export const tenancyService = {
  list(tenantId: string) {
    return prisma.tenancyRequest.findMany({ where: { tenantId }, include, orderBy: { createdAt: 'desc' } });
  },
  ownerList(ownerId: string) {
    return prisma.tenancyRequest.findMany({ where: { ownerId }, include, orderBy: { createdAt: 'desc' } });
  },
  async options(tenantId: string) {
    const assignments = await prisma.roomAssignment.findMany({ where: { tenantId, isActive: true }, include: {
      room: { include: { property: { select: { name: true, ownerId: true } } } },
    } });
    const rooms = await prisma.room.findMany({ where: { applicationsOpen: true, status: { in: ['AVAILABLE', 'OCCUPIED'] }, property: { isActive: true, ownerId: { in: assignments.map((a) => a.room.property.ownerId) } } }, select: { id: true, name: true, monthlyRent: true, capacity: true, roommatesLimit: true, occupantCount: true, property: { select: { name: true, ownerId: true } } } });
    return { assignments, rooms: rooms.filter((r) => r.occupantCount < Math.min(r.capacity, r.roommatesLimit)) };
  },
  async create(tenantId: string, input: { assignmentId: string; type: 'LEAVE' | 'CHANGE'; reason: string; targetRoomId?: string }) {
    return prisma.$transaction(async (tx) => {
      const assignment = await tx.roomAssignment.findFirst({ where: { id: input.assignmentId, tenantId, isActive: true }, include: { room: { include: { property: true } } } });
      if (!assignment) throw notFound('Active tenancy not found');
      // Serialize requests for this tenancy, including simultaneous submissions.
      await tx.roomAssignment.update({ where: { id: assignment.id }, data: { updatedAt: new Date() } });
      if (await tx.tenancyRequest.findFirst({ where: { assignmentId: assignment.id, status: 'PENDING' } })) throw conflict('You already have a pending request for this tenancy');
      if (input.type === 'CHANGE') {
        if (!input.targetRoomId || input.targetRoomId === assignment.roomId) throw badRequest('Choose a different room');
        const target = await tx.room.findFirst({ where: { id: input.targetRoomId, property: { ownerId: assignment.room.property.ownerId, isActive: true }, applicationsOpen: true, status: { in: ['AVAILABLE', 'OCCUPIED'] } } });
        if (!target || target.occupantCount >= Math.min(target.capacity, target.roommatesLimit)) throw conflict('Choose an open room with a free bed from the same owner');
      }
      const request = await tx.tenancyRequest.create({ data: {
        tenantId, ownerId: assignment.room.property.ownerId, assignmentId: assignment.id,
        type: input.type, reason: input.reason, targetRoomId: input.type === 'CHANGE' ? input.targetRoomId : null,
      } });
      await tx.notification.create({ data: { userId: request.ownerId, type: 'LEASE_UPDATE', title: 'New tenancy request', body: `A tenant requested to ${input.type === 'LEAVE' ? 'leave' : 'change'} ${assignment.room.name}. Review under Leases.`, relatedType: 'TENANCY_REQUEST', relatedId: request.id } });
      return request;
    });
  },
  async cancel(tenantId: string, id: string) {
    const result = await prisma.tenancyRequest.updateMany({ where: { id, tenantId, status: 'PENDING' }, data: { status: 'CANCELLED', reviewedAt: new Date() } });
    if (!result.count) throw conflict('Pending request not found');
    return { success: true };
  },
  async review(ownerId: string, id: string, input: { decision: 'APPROVE' | 'REJECT'; ownerNote?: string }) {
    return prisma.$transaction(async (tx) => {
      const request = await tx.tenancyRequest.findFirst({ where: { id, ownerId }, include: { assignment: true } });
      if (!request) throw notFound('Request not found');
      const claimed = await tx.tenancyRequest.updateMany({ where: { id, ownerId, status: 'PENDING' }, data: { status: input.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED', reviewedAt: new Date(), ownerNote: input.ownerNote } });
      if (!claimed.count) throw conflict('Request has already been reviewed or cancelled');
      if (input.decision === 'APPROVE') {
        const assignment = request.assignment;
        if (!assignment.isActive) throw conflict('This tenancy has already ended');
        const now = new Date();
        const leases = await tx.lease.findMany({ where: { tenantId: request.tenantId, roomId: assignment.roomId, status: 'ACTIVE' } });
        if (request.type === 'CHANGE') {
          const target = await tx.room.findFirst({ where: { id: request.targetRoomId!, property: { ownerId, isActive: true }, applicationsOpen: true, status: { in: ['AVAILABLE', 'OCCUPIED'] } }, include: { property: true } });
          if (!target) throw conflict('Target room is no longer open');
          const count = await tx.roomAssignment.count({ where: { roomId: target.id, isActive: true } });
          if (count >= Math.min(target.capacity, target.roommatesLimit)) throw conflict('Target room is full');
          if (await tx.roomAssignment.findFirst({ where: { tenantId: request.tenantId, roomId: target.id, isActive: true } })) throw conflict('Tenant already occupies the target room');
          if (leases.length !== 1 || leases[0].endDate <= now) throw conflict('Room changes require one current active lease. Update the lease first.');
          const lease = leases[0];
          const food = effectiveFood(target, target.property);
          const foodOptIn = assignment.foodOptIn && food.foodEnabled;
          await tx.roomAssignment.create({ data: { tenantId: request.tenantId, roomId: target.id, startDate: now, endDate: lease.endDate, foodOptIn } });
          await tx.lease.create({ data: { tenantId: request.tenantId, roomId: target.id, startDate: now, endDate: lease.endDate, monthlyRent: target.monthlyRent, securityDeposit: target.securityDeposit, rentDueDay: lease.rentDueDay, foodCharge: foodOptIn ? food.foodCharge : 0, terms: lease.terms } });
          await refreshRoom(tx, target.id);
        }
        await tx.roomAssignment.update({ where: { id: assignment.id }, data: { isActive: false, endDate: now } });
        await tx.lease.updateMany({ where: { tenantId: request.tenantId, roomId: assignment.roomId, status: 'ACTIVE' }, data: { status: 'TERMINATED' } });
        await refreshRoom(tx, assignment.roomId);
      }
      await tx.notification.create({ data: { userId: request.tenantId, type: 'LEASE_UPDATE', title: `Tenancy request ${input.decision === 'APPROVE' ? 'approved' : 'rejected'}`, body: input.ownerNote || (input.decision === 'APPROVE' ? 'Your tenancy has been updated.' : 'Your current tenancy is unchanged.'), relatedType: 'TENANCY_REQUEST', relatedId: id } });
      return { success: true };
    });
  },
};
