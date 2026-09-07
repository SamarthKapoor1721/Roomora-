import { aiClient } from '../../lib/aiClient';
import { prisma } from '../../lib/prisma';

/** Aggregated metrics for the owner dashboard. */
export async function ownerDashboard(ownerId: string) {
  const propertyFilter = { property: { ownerId } };
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [
    properties,
    rooms,
    roomAgg,
    applicationsByStatus,
    pendingApprovals,
    activeLeases,
    expiringLeases,
    paymentAgg,
    latePayments,
    overduePayments,
    revenueThisMonth,
    maintenanceByStatus,
    cleaningByStatus,
    activeWarnings,
    warningsBySeverity,
  ] = await Promise.all([
    prisma.property.count({ where: { ownerId, isActive: true } }),
    prisma.room.count({ where: { ...propertyFilter, status: { not: 'INACTIVE' } } }),
    prisma.room.aggregate({
      where: { ...propertyFilter, status: { not: 'INACTIVE' } },
      _sum: { capacity: true, occupantCount: true },
    }),
    prisma.application.groupBy({
      by: ['status'],
      where: { room: propertyFilter },
      _count: { _all: true },
    }),
    prisma.application.count({ where: { room: propertyFilter, status: { in: ['OWNER_REVIEW', 'AI_COMPLETE'] } } }),
    prisma.lease.count({ where: { room: propertyFilter, status: 'ACTIVE' } }),
    prisma.lease.count({
      where: {
        room: propertyFilter,
        status: 'ACTIVE',
        endDate: { lte: new Date(now.getTime() + 30 * 86_400_000), gte: now },
      },
    }),
    prisma.payment.aggregate({
      where: { lease: { room: propertyFilter } },
      _sum: { totalAmount: true, amountPaid: true },
    }),
    prisma.payment.count({ where: { lease: { room: propertyFilter }, daysLate: { gt: 0 } } }),
    prisma.payment.count({ where: { lease: { room: propertyFilter }, status: 'OVERDUE' } }),
    prisma.payment.aggregate({
      where: { lease: { room: propertyFilter }, paidDate: { gte: monthStart } },
      _sum: { amountPaid: true },
    }),
    prisma.maintenanceRequest.groupBy({
      by: ['status'],
      where: { room: propertyFilter },
      _count: { _all: true },
    }),
    prisma.cleaningTask.groupBy({
      by: ['status'],
      where: { property: { ownerId } },
      _count: { _all: true },
    }),
    prisma.warning.count({
      where: {
        status: 'ACTIVE',
        tenant: { tenancies: { some: { room: propertyFilter } } },
      },
    }),
    prisma.warning.groupBy({
      by: ['severity'],
      where: { status: 'ACTIVE', tenant: { tenancies: { some: { room: propertyFilter } } } },
      _count: { _all: true },
    }),
  ]);

  const totalCapacity = roomAgg._sum.capacity ?? 0;
  const totalOccupants = roomAgg._sum.occupantCount ?? 0;
  const vacantBeds = Math.max(0, totalCapacity - totalOccupants);
  const occupancyRate = totalCapacity > 0 ? Math.round((totalOccupants / totalCapacity) * 100) : 0;
  const billed = Number(paymentAgg._sum.totalAmount ?? 0);
  const collected = Number(paymentAgg._sum.amountPaid ?? 0);

  const asMap = (rows: Array<{ status?: string; severity?: string; _count: { _all: number } }>, key: 'status' | 'severity') =>
    Object.fromEntries(rows.map((r) => [r[key], r._count._all]));

  return {
    generatedAt: now.toISOString(),
    properties: { total: properties },
    occupancy: {
      totalCapacity,
      totalOccupants,
      vacantBeds,
      occupancyRate,
      rooms,
      vacantRooms: await prisma.room.count({ where: { ...propertyFilter, status: 'AVAILABLE' } }),
    },
    applications: {
      byStatus: asMap(applicationsByStatus, 'status'),
      pendingApprovals,
    },
    leases: { active: activeLeases, expiringSoon: expiringLeases },
    revenue: {
      billedAllTime: billed,
      collectedAllTime: collected,
      outstanding: Math.max(0, billed - collected),
      collectedThisMonth: Number(revenueThisMonth._sum.amountPaid ?? 0),
    },
    payments: { latePayments, overduePayments },
    maintenance: {
      byStatus: asMap(maintenanceByStatus, 'status'),
      open:
        (asMap(maintenanceByStatus, 'status').OPEN ?? 0) +
        (asMap(maintenanceByStatus, 'status').ASSIGNED ?? 0) +
        (asMap(maintenanceByStatus, 'status').IN_PROGRESS ?? 0),
    },
    cleaning: {
      byStatus: asMap(cleaningByStatus, 'status'),
      pending:
        (asMap(cleaningByStatus, 'status').SCHEDULED ?? 0) +
        (asMap(cleaningByStatus, 'status').ASSIGNED ?? 0) +
        (asMap(cleaningByStatus, 'status').IN_PROGRESS ?? 0),
    },
    warnings: { active: activeWarnings, bySeverity: asMap(warningsBySeverity, 'severity') },
  };
}

export async function ownerInsights(ownerId: string) {
  const metrics = await ownerDashboard(ownerId);
  const ai = await aiClient.insights({ metrics: metrics as unknown as Record<string, unknown> });
  return { metrics, ai };
}

export async function tenantDashboard(tenantId: string) {
  const [assignment, roommates, activeLease, payments, upcomingPayment, maintenance, unreadNotifications, warnings] =
    await Promise.all([
      prisma.roomAssignment.findFirst({
        where: { tenantId, isActive: true },
        include: { room: { include: { property: true } } },
      }),
      prisma.roomAssignment.findMany({
        where: {
          isActive: true,
          tenantId: { not: tenantId },
          room: { assignments: { some: { tenantId, isActive: true } } },
        },
        include: { tenant: { select: { id: true, fullName: true, phone: true } } },
      }),
      prisma.lease.findFirst({ where: { tenantId, status: 'ACTIVE' }, orderBy: { startDate: 'desc' } }),
      prisma.payment.aggregate({
        where: { tenantId },
        _sum: { totalAmount: true, amountPaid: true },
      }),
      prisma.payment.findFirst({
        where: { tenantId, status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } },
        orderBy: { dueDate: 'asc' },
      }),
      prisma.maintenanceRequest.groupBy({ by: ['status'], where: { tenantId }, _count: { _all: true } }),
      prisma.notification.count({ where: { userId: tenantId, readAt: null } }),
      prisma.warning.count({ where: { tenantId, status: 'ACTIVE' } }),
    ]);

  const billed = Number(payments._sum.totalAmount ?? 0);
  const paid = Number(payments._sum.amountPaid ?? 0);

  let food: { enabled: boolean; charge: number; optedIn: boolean } = { enabled: false, charge: 0, optedIn: false };
  if (assignment) {
    const enabled = assignment.room.foodEnabled || assignment.room.property.foodEnabled;
    const charge = enabled
      ? Number(assignment.room.foodCharge) || Number(assignment.room.property.foodCharge)
      : 0;
    food = { enabled, charge, optedIn: assignment.foodOptIn };
  }

  return {
    room: assignment
      ? {
          id: assignment.room.id,
          name: assignment.room.name,
          floor: assignment.room.floor,
          property: {
            name: assignment.room.property.name,
            addressLine1: assignment.room.property.addressLine1,
            city: assignment.room.property.city,
          },
          startDate: assignment.startDate,
        }
      : null,
    roommates: roommates.map((r) => ({ id: r.tenant.id, fullName: r.tenant.fullName, phone: r.tenant.phone })),
    lease: activeLease
      ? {
          id: activeLease.id,
          startDate: activeLease.startDate,
          endDate: activeLease.endDate,
          monthlyRent: Number(activeLease.monthlyRent),
          foodCharge: Number(activeLease.foodCharge),
        }
      : null,
    food,
    rent: {
      billed,
      paid,
      outstanding: Math.max(0, billed - paid),
      nextDue: upcomingPayment
        ? {
            id: upcomingPayment.id,
            period: `${upcomingPayment.periodMonth}/${upcomingPayment.periodYear}`,
            amount: Number(upcomingPayment.totalAmount) - Number(upcomingPayment.amountPaid),
            dueDate: upcomingPayment.dueDate,
            status: upcomingPayment.status,
          }
        : null,
    },
    maintenance: Object.fromEntries(maintenance.map((m) => [m.status, m._count._all])),
    notifications: { unread: unreadNotifications },
    warnings: { active: warnings },
  };
}

export async function staffDashboard(staffId: string) {
  const [maintOpen, maintByStatus, cleanByStatus, overdueMaint, overdueClean, recentCompleted] = await Promise.all([
    prisma.maintenanceRequest.count({
      where: { assignedStaffId: staffId, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
    }),
    prisma.maintenanceRequest.groupBy({ by: ['status'], where: { assignedStaffId: staffId }, _count: { _all: true } }),
    prisma.cleaningTask.groupBy({ by: ['status'], where: { assignedStaffId: staffId }, _count: { _all: true } }),
    prisma.maintenanceRequest.count({
      where: {
        assignedStaffId: staffId,
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
        priority: { in: ['HIGH', 'URGENT'] },
        createdAt: { lt: new Date(Date.now() - 2 * 86_400_000) },
      },
    }),
    prisma.cleaningTask.count({
      where: {
        assignedStaffId: staffId,
        status: { notIn: ['COMPLETED', 'MISSED'] },
        scheduledFor: { lt: new Date() },
      },
    }),
    prisma.maintenanceRequest.count({
      where: { assignedStaffId: staffId, status: 'COMPLETED', completedAt: { gte: new Date(Date.now() - 30 * 86_400_000) } },
    }),
  ]);

  const asMap = (rows: Array<{ status: string; _count: { _all: number } }>) =>
    Object.fromEntries(rows.map((r) => [r.status, r._count._all]));

  return {
    maintenance: { open: maintOpen, byStatus: asMap(maintByStatus) },
    cleaning: { byStatus: asMap(cleanByStatus) },
    overdue: { maintenance: overdueMaint, cleaning: overdueClean },
    completedLast30Days: recentCompleted,
  };
}
