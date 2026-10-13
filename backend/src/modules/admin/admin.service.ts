import { conflict, notFound } from '../../lib/errors';
import { prisma } from '../../lib/prisma';

/** Return an existing tenant to the pool without deleting rental or payment history. */
export async function resetTenantForAllocation(tenantId: string) {
  return prisma.$transaction(async (tx) => {
    const tenant = await tx.user.findUnique({ where: { id: tenantId }, select: { id: true, role: true, isActive: true } });
    if (!tenant) throw notFound('Tenant not found');
    if (tenant.role !== 'TENANT') throw conflict('Only tenant accounts can be reset for allocation');
    if (!tenant.isActive) throw conflict('Activate this tenant account before resetting it');

    const assignments = await tx.roomAssignment.findMany({ where: { tenantId, isActive: true }, select: { id: true, roomId: true } });
    if (!assignments.length) throw conflict('This tenant has no active room assignment');
    const now = new Date();
    const roomIds = [...new Set(assignments.map((assignment) => assignment.roomId))];

    await tx.tenancyRequest.updateMany({ where: { tenantId, status: 'PENDING' }, data: { status: 'CANCELLED', reviewedAt: now, ownerNote: 'Cancelled when a super admin reset the tenant for allocation.' } });
    await tx.application.updateMany({ where: { tenantId, status: { in: ['DRAFT', 'SUBMITTED', 'DOCS_PENDING', 'UNDER_AI_REVIEW', 'AI_COMPLETE', 'OWNER_REVIEW'] } }, data: { status: 'WITHDRAWN' } });
    await tx.roomAssignment.updateMany({ where: { tenantId, isActive: true }, data: { isActive: false, endDate: now } });
    await tx.lease.updateMany({ where: { tenantId, status: 'ACTIVE' }, data: { status: 'TERMINATED' } });

    for (const roomId of roomIds) {
      const room = await tx.room.findUnique({ where: { id: roomId }, select: { status: true, capacity: true, occupantCount: true } });
      if (!room) continue;
      const count = await tx.roomAssignment.count({ where: { roomId, isActive: true } });
      await tx.room.update({ where: { id: roomId }, data: {
        occupantCount: count,
        status: room.status === 'INACTIVE' ? 'INACTIVE' : count === 0 ? 'AVAILABLE' : count >= room.capacity ? 'FULL' : 'OCCUPIED',
      } });
    }
    await tx.notification.create({ data: { userId: tenantId, type: 'LEASE_UPDATE', title: 'Tenancy ended', body: 'An administrator ended your current tenancy. You can be allocated to a new property.' } });
    return { tenantId, endedAssignments: assignments.length };
  });
}
