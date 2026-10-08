import { prisma } from '../../lib/prisma';

/**
 * Deterministic data retrievers for the owner AI assistant. Each returns real
 * rows scoped to the owner. The AI service is given ONLY this data as context
 * and is instructed not to invent anything beyond it.
 */
export const assistantTools = {
  async overdueRent(ownerId: string) {
    const rows = await prisma.payment.findMany({
      where: { lease: { room: { property: { ownerId } } }, status: 'OVERDUE' },
      orderBy: { dueDate: 'asc' },
      take: 100,
      include: {
        tenant: { select: { fullName: true, email: true, phone: true } },
        lease: { select: { room: { select: { name: true } } } },
      },
    });
    return rows.map((p) => ({
      tenant: p.tenant.fullName,
      email: p.tenant.email,
      phone: p.tenant.phone,
      room: p.lease.room.name,
      period: `${p.periodMonth}/${p.periodYear}`,
      dueDate: p.dueDate.toISOString().slice(0, 10),
      daysLate: p.daysLate,
      outstanding: Number(p.totalAmount) - Number(p.amountPaid),
    }));
  },

  async vacantRooms(ownerId: string) {
    const rows = await prisma.room.findMany({
      where: {
        property: { ownerId },
        status: { in: ['AVAILABLE', 'OCCUPIED'] },
      },
      include: { property: { select: { name: true, city: true } } },
    });
    return rows
      .filter((r) => r.occupantCount < r.capacity)
      .map((r) => ({
        room: r.name,
        property: r.property.name,
        city: r.property.city,
        capacity: r.capacity,
        occupants: r.occupantCount,
        occupancy: r.occupantCount === 0 ? 'EMPTY' : 'PARTIALLY_OCCUPIED',
        vacantBeds: r.capacity - r.occupantCount,
        monthlyRent: Number(r.monthlyRent),
        applicationsOpen: r.applicationsOpen,
      }));
  },

  async leasesExpiring(ownerId: string, withinDays = 31) {
    const now = new Date();
    const until = new Date(now.getTime() + withinDays * 86_400_000);
    const rows = await prisma.lease.findMany({
      where: { room: { property: { ownerId } }, status: 'ACTIVE', endDate: { gte: now, lte: until } },
      orderBy: { endDate: 'asc' },
      include: {
        tenant: { select: { fullName: true, email: true } },
        room: { select: { name: true } },
      },
    });
    return rows.map((l) => ({
      tenant: l.tenant.fullName,
      email: l.tenant.email,
      room: l.room.name,
      endDate: l.endDate.toISOString().slice(0, 10),
      daysRemaining: Math.ceil((l.endDate.getTime() - now.getTime()) / 86_400_000),
      monthlyRent: Number(l.monthlyRent),
    }));
  },

  async revenueSummary(ownerId: string) {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const [all, thisMonth] = await Promise.all([
      prisma.payment.aggregate({
        where: { lease: { room: { property: { ownerId } } } },
        _sum: { totalAmount: true, amountPaid: true },
      }),
      prisma.payment.aggregate({
        where: { lease: { room: { property: { ownerId } } }, paidDate: { gte: monthStart } },
        _sum: { amountPaid: true },
      }),
    ]);
    const billed = Number(all._sum.totalAmount ?? 0);
    const collected = Number(all._sum.amountPaid ?? 0);
    return {
      totalBilled: billed,
      totalCollected: collected,
      outstanding: Math.max(0, billed - collected),
      collectedThisMonth: Number(thisMonth._sum.amountPaid ?? 0),
    };
  },

  async maintenanceFrequency(ownerId: string) {
    const rows = await prisma.maintenanceRequest.groupBy({
      by: ['category'],
      where: { room: { property: { ownerId } } },
      _count: { _all: true },
    });
    return rows
      .map((r) => ({ category: r.category ?? 'Uncategorised', count: r._count._all }))
      .sort((a, b) => b.count - a.count);
  },

  async pendingApplications(ownerId: string) {
    const rows = await prisma.application.findMany({
      where: { room: { property: { ownerId } }, status: { in: ['OWNER_REVIEW', 'AI_COMPLETE', 'UNDER_AI_REVIEW'] } },
      include: {
        tenant: { select: { fullName: true } },
        room: { select: { name: true } },
        eligibility: { select: { score: true, scoreLabel: true, source: true, recommendation: true } },
      },
    });
    return rows.map((a) => ({
      tenant: a.tenant.fullName,
      room: a.room.name,
      status: a.status,
      aiScore: a.eligibility ? `${a.eligibility.score}% (${a.eligibility.scoreLabel}, ${a.eligibility.source})` : 'pending',
      aiRecommendation: a.eligibility?.recommendation ?? 'pending',
    }));
  },

  async occupancyOverview(ownerId: string) {
    const rows = await prisma.property.findMany({
      where: { ownerId, isActive: true },
      include: { rooms: { select: { name: true, capacity: true, occupantCount: true, status: true } } },
    });
    return rows.map((p) => {
      const capacity = p.rooms.reduce((s, r) => s + r.capacity, 0);
      const occ = p.rooms.reduce((s, r) => s + r.occupantCount, 0);
      return {
        property: p.name,
        rooms: p.rooms.length,
        occupiedRooms: p.rooms.filter((r) => r.occupantCount > 0).length,
        vacantRooms: p.rooms.filter((r) => r.occupantCount === 0).length,
        fullRooms: p.rooms.filter((r) => r.capacity > 0 && r.occupantCount >= r.capacity).length,
        roomDetails: p.rooms.map((r) => ({ room: r.name, occupants: r.occupantCount, capacity: r.capacity })),
        capacity,
        occupants: occ,
        occupancyRate: capacity > 0 ? Math.round((occ / capacity) * 100) : 0,
      };
    });
  },

  async activeWarnings(ownerId: string) {
    const rows = await prisma.warning.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { issuedById: ownerId },
          { tenant: { tenancies: { some: { room: { property: { ownerId } } } } } },
        ],
      },
      orderBy: { severity: 'desc' },
      take: 100,
      include: { tenant: { select: { fullName: true } } },
    });
    return rows.map((w) => ({
      type: w.type,
      severity: w.severity,
      tenant: w.tenant?.fullName ?? null,
      title: w.title,
      message: w.message,
    }));
  },
};

export type AssistantToolName = keyof typeof assistantTools;

/** Simple keyword router: picks which retrievers to run for a question. */
export function selectTools(question: string): AssistantToolName[] {
  const q = question.toLowerCase();
  const picks = new Set<AssistantToolName>();

  if (/(overdue|late|unpaid|owe|arrears|behind on rent)/.test(q)) picks.add('overdueRent');
  if (/(vacant|empty|available room|free bed|unoccupied|open for application|open room|which rooms|list.*rooms|rent|price|charge|how much)/.test(q))
    picks.add('vacantRooms');
  if (/(lease|expir|renew|ending|end date)/.test(q)) picks.add('leasesExpiring');
  if (/(revenue|income|earnings|collected|money|financ|outstanding|profit)/.test(q)) picks.add('revenueSummary');
  if (/(maintenance|repair|issue|broken|fix)/.test(q)) picks.add('maintenanceFrequency');
  if (/(application|applicant|approve|pending review|screening|tenant.*appl)/.test(q)) picks.add('pendingApplications');
  if (/(occupancy|occupied|vacant|empty|filled|full|free bed|available room|which rooms|utilization|utilisation|how many rooms|how many propert)/.test(q)) picks.add('occupancyOverview');
  if (/(warning|alert|risk|flag)/.test(q)) picks.add('activeWarnings');

  // Default: give a broad snapshot.
  if (picks.size === 0) {
    picks.add('occupancyOverview');
    picks.add('vacantRooms');
    picks.add('overdueRent');
    picks.add('revenueSummary');
    picks.add('pendingApplications');
  }
  return [...picks];
}

export async function gatherContext(ownerId: string, question: string) {
  const tools = selectTools(question);
  const context: Record<string, unknown> = {};
  await Promise.all(
    tools.map(async (name) => {
      context[name] = await assistantTools[name](ownerId);
    }),
  );
  return { tools, context };
}
