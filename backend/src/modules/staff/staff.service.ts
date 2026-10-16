import { randomInt, randomUUID } from 'node:crypto';
import { ownerStaffOrThrow } from '../../lib/access';
import { hashPassword } from '../../lib/auth';
import { conflict, notFound } from '../../lib/errors';
import { notify } from '../../lib/notify';
import { parsePage } from '../../lib/pagination';
import { prisma } from '../../lib/prisma';

async function generateWorkerId(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const workerId = String(randomInt(10_000_000, 100_000_000));
    const [profile, user] = await Promise.all([
      prisma.staffProfile.findFirst({ where: { workerId } }),
      prisma.user.findFirst({ where: { role: 'STAFF', phone: workerId } }),
    ]);
    if (!profile && !user) return workerId;
  }
  throw conflict('Could not generate a worker ID. Please try again.');
}

export const staffService = {
  /** Owner creates a staff account (STAFF users cannot self-register). */
  async create(
    ownerId: string,
    input: {
      password: string;
      fullName: string;
      phone: string;
      staffType: 'MAINTENANCE' | 'CLEANING' | 'GENERAL';
      skills?: string[];
    },
  ) {
    if (await prisma.user.findFirst({ where: { role: 'STAFF', phone: input.phone } })) throw conflict('A staff account with this phone number already exists');
    if (await prisma.staffProfile.findFirst({ where: { workerId: input.phone } })) throw conflict('This phone number is already used as a worker ID');
    const workerId = await generateWorkerId();

    const user = await prisma.user.create({
      data: {
        email: `staff-${randomUUID()}@accounts.roomora.invalid`,
        passwordHash: await hashPassword(input.password),
        fullName: input.fullName,
        phone: input.phone,
        role: 'STAFF',
        staffType: input.staffType,
        staffProfile: {
          create: {
            ownerId,
            workerId,
            staffType: input.staffType,
            skills: input.skills ?? [],
          },
        },
      },
      include: { staffProfile: true },
    });

    await notify({
      userId: user.id,
      type: 'GENERAL',
      title: 'Welcome to the team',
      body: 'Your staff account has been created. You can now view assigned tasks.',
    });

    return {
      id: user.id,
      workerId: user.staffProfile?.workerId ?? null,
      fullName: user.fullName,
      phone: user.phone,
      staffType: user.staffType,
      skills: user.staffProfile?.skills ?? [],
      isActive: user.isActive,
    };
  },

  async list(ownerId: string, query: Record<string, unknown>) {
    const { skip, take, page, pageSize } = parsePage(query);
    const where = {
      ownerId,
      ...(query.staffType ? { staffType: query.staffType as never } : {}),
      ...(query.isActive ? { isActive: query.isActive === 'true' } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.staffProfile.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              isActive: true,
              _count: { select: { assignedMaintenance: true, assignedCleaning: true } },
            },
          },
        },
      }),
      prisma.staffProfile.count({ where }),
    ]);
    const items = rows.map((r) => ({
      id: r.user.id,
      workerId: r.workerId,
      fullName: r.user.fullName,
      phone: r.user.phone,
      staffType: r.staffType,
      skills: r.skills,
      isActive: r.isActive && r.user.isActive,
      openMaintenance: r.user._count.assignedMaintenance,
      openCleaning: r.user._count.assignedCleaning,
      createdAt: r.createdAt,
    }));
    return { items, meta: { page, pageSize, total } };
  },

  async get(ownerId: string, staffUserId: string) {
    const profile = await ownerStaffOrThrow(ownerId, staffUserId);
    const [maintenance, cleaning] = await Promise.all([
      prisma.maintenanceRequest.findMany({
        where: { assignedStaffId: staffUserId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { room: { select: { name: true } } },
      }),
      prisma.cleaningTask.findMany({
        where: { assignedStaffId: staffUserId },
        orderBy: { scheduledFor: 'desc' },
        take: 50,
        include: { property: { select: { name: true } } },
      }),
    ]);
    return {
      id: profile.user.id,
      workerId: profile.workerId,
      fullName: profile.user.fullName,
      phone: profile.user.phone,
      staffType: profile.staffType,
      skills: profile.skills,
      isActive: profile.isActive && profile.user.isActive,
      maintenance,
      cleaning,
    };
  },

  async update(
    ownerId: string,
    staffUserId: string,
    input: { fullName?: string; phone?: string; staffType?: string; skills?: string[]; isActive?: boolean },
  ) {
    const profile = await ownerStaffOrThrow(ownerId, staffUserId);
    if (input.phone && await prisma.user.findFirst({ where: { role: 'STAFF', phone: input.phone, id: { not: staffUserId } } })) throw conflict('A staff account with this phone number already exists');
    if (input.phone && await prisma.staffProfile.findFirst({ where: { workerId: input.phone, userId: { not: staffUserId } } })) throw conflict('This phone number is already used as a worker ID');
    const [, user] = await prisma.$transaction([
      prisma.staffProfile.update({
        where: { userId: staffUserId },
        data: {
          staffType: input.staffType as never,
          skills: input.skills,
          isActive: input.isActive,
        },
      }),
      prisma.user.update({
        where: { id: staffUserId },
        data: {
          fullName: input.fullName,
          phone: input.phone,
          staffType: input.staffType as never,
          isActive: input.isActive,
        },
      }),
    ]);
    return { id: user.id, fullName: user.fullName, phone: user.phone, staffType: user.staffType, workerId: profile.workerId, isActive: user.isActive };
  },

  async deactivate(ownerId: string, staffUserId: string) {
    await ownerStaffOrThrow(ownerId, staffUserId);
    const open = await prisma.maintenanceRequest.count({
      where: { assignedStaffId: staffUserId, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
    });
    const openC = await prisma.cleaningTask.count({
      where: { assignedStaffId: staffUserId, status: { notIn: ['COMPLETED', 'MISSED'] } },
    });
    if (open + openC > 0) {
      throw conflict(`Reassign this staff member's ${open + openC} open task(s) before deactivating`);
    }
    await prisma.$transaction([
      prisma.staffProfile.update({ where: { userId: staffUserId }, data: { isActive: false } }),
      prisma.user.update({ where: { id: staffUserId }, data: { isActive: false } }),
      prisma.refreshToken.updateMany({ where: { userId: staffUserId, OR: [{ revokedAt: null }, { revokedAt: { isSet: false } }] }, data: { revokedAt: new Date() } }),
    ]);
  },

  /** Staff self-view of their own summary. */
  async myProfile(staffUserId: string) {
    const profile = await prisma.staffProfile.findUnique({
      where: { userId: staffUserId },
      include: { user: { select: { id: true, fullName: true, phone: true } }, owner: { select: { fullName: true } } },
    });
    if (!profile) throw notFound('Staff profile not found');
    const [maintenanceCounts, cleaningCounts] = await Promise.all([
      prisma.maintenanceRequest.groupBy({ by: ['status'], where: { assignedStaffId: staffUserId }, _count: true }),
      prisma.cleaningTask.groupBy({ by: ['status'], where: { assignedStaffId: staffUserId }, _count: true }),
    ]);
    return {
      ...profile.user,
      staffType: profile.staffType,
      workerId: profile.workerId,
      skills: profile.skills,
      managedBy: profile.owner.fullName,
      maintenanceCounts,
      cleaningCounts,
    };
  },
};
