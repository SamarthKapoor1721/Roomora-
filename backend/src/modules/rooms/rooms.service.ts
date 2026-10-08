import type { Prisma } from '@prisma/client';
import { ownerPropertyOrThrow, ownerRoomOrThrow } from '../../lib/access';
import { badRequest, conflict } from '../../lib/errors';
import { publicImage } from '../../lib/images';
import { prisma } from '../../lib/prisma';
import { parsePage } from '../../lib/pagination';

const imageSelect = {
  select: { id: true, path: true, originalName: true, sortOrder: true },
  orderBy: { sortOrder: 'asc' },
} satisfies Prisma.Room$imagesArgs;

/** Effective food availability: property-level OR room-level enables it. */
export function effectiveFood(room: { foodEnabled: boolean; foodCharge: unknown }, property: { foodEnabled: boolean; foodCharge: unknown }) {
  const enabled = property.foodEnabled || room.foodEnabled;
  const roomCharge = Number(room.foodCharge) || 0;
  const propCharge = Number(property.foodCharge) || 0;
  return { foodEnabled: enabled, foodCharge: enabled ? roomCharge || propCharge : 0 };
}

function deriveStatus(occupantCount: number, capacity: number, current: string): string {
  if (current === 'INACTIVE') return 'INACTIVE';
  if (occupantCount <= 0) return 'AVAILABLE';
  if (occupantCount >= capacity) return 'FULL';
  return 'OCCUPIED';
}

export const roomsService = {
  assertOwner: ownerRoomOrThrow,

  async create(ownerId: string, input: Record<string, unknown>) {
    await ownerPropertyOrThrow(ownerId, input.propertyId as string);
    if ((input.roommatesLimit as number) > (input.capacity as number)) {
      throw badRequest('roommatesLimit cannot exceed capacity');
    }
    return prisma.room.create({ data: input as never });
  },

  async list(ownerId: string, query: Record<string, unknown>) {
    const { skip, take, page, pageSize } = parsePage(query);
    const where: Prisma.RoomWhereInput = { property: { ownerId } };
    if (query.propertyId) where.propertyId = query.propertyId as string;
    if (query.status) where.status = query.status as never;
    if (query.applicationsOpen) where.applicationsOpen = query.applicationsOpen === 'true';

    const [items, total] = await Promise.all([
      prisma.room.findMany({
        where,
        skip,
        take,
        orderBy: [{ propertyId: 'asc' }, { name: 'asc' }],
        include: {
          property: { select: { id: true, name: true, city: true, foodEnabled: true, foodCharge: true } },
          images: imageSelect,
          _count: { select: { applications: true, assignments: { where: { isActive: true } } } },
        },
      }),
      prisma.room.count({ where }),
    ]);

    return {
      items: items.map((r) => ({ ...r, images: r.images.map(publicImage) })),
      meta: { page, pageSize, total },
    };
  },

  async get(ownerId: string, id: string) {
    const room = await ownerRoomOrThrow(ownerId, id);
    return prisma.room.findUnique({
      where: { id },
      include: {
        property: true,
        images: imageSelect,
        assignments: {
          where: { isActive: true },
          include: { tenant: { select: { id: true, fullName: true, email: true, phone: true } } },
        },
        applications: {
          orderBy: { createdAt: 'desc' },
          include: {
            tenant: { select: { id: true, fullName: true, email: true } },
            eligibility: true,
            docVerification: true,
          },
        },
        leases: { where: { status: 'ACTIVE' } },
      },
    }).then((r) => {
      if (!r) return r;
      return { ...r, images: r.images.map(publicImage), effectiveFood: effectiveFood(room, room.property) };
    });
  },

  async update(ownerId: string, id: string, input: Record<string, unknown>) {
    const room = await ownerRoomOrThrow(ownerId, id);
    const capacity = (input.capacity as number) ?? room.capacity;
    const roommatesLimit = (input.roommatesLimit as number) ?? room.roommatesLimit;
    if (roommatesLimit > capacity) throw badRequest('roommatesLimit cannot exceed capacity');
    if (capacity < room.occupantCount) {
      throw conflict(`Capacity (${capacity}) cannot be below current occupants (${room.occupantCount})`);
    }
    const next = await prisma.room.update({ where: { id }, data: input as never });
    // Keep status coherent with occupancy unless explicitly set.
    if (input.status === undefined) {
      const status = deriveStatus(next.occupantCount, next.capacity, next.status);
      if (status !== next.status) {
        return prisma.room.update({ where: { id }, data: { status: status as never } });
      }
    }
    return next;
  },

  async setApplicationsOpen(ownerId: string, id: string, open: boolean) {
    const room = await ownerRoomOrThrow(ownerId, id);
    if (open) {
      if (room.status === 'INACTIVE') throw conflict('Cannot open applications on an inactive room');
      if (room.occupantCount >= room.capacity) {
        throw conflict('Room is at full capacity; free a bed before opening applications');
      }
    }
    return prisma.room.update({ where: { id }, data: { applicationsOpen: open } });
  },

  async remove(ownerId: string, id: string) {
    const room = await ownerRoomOrThrow(ownerId, id);
    if (room.occupantCount > 0) throw conflict('Cannot remove a room with active occupants');
    await prisma.room.update({
      where: { id },
      data: { status: 'INACTIVE', applicationsOpen: false },
    });
  },

  // ----- Tenant-facing browse -----
  async browse(query: Record<string, unknown>) {
    const { skip, take, page, pageSize } = parsePage(query);
    const where: Prisma.RoomWhereInput = {
      status: { in: ['AVAILABLE', 'OCCUPIED', 'FULL'] },
      property: { isActive: true },
    };
    if (query.city) where.property = { ...where.property as object, city: { contains: query.city as string, mode: 'insensitive' } };
    if (query.minRent || query.maxRent) {
      where.monthlyRent = {};
      if (query.minRent) (where.monthlyRent as Prisma.FloatFilter).gte = query.minRent as number;
      if (query.maxRent) (where.monthlyRent as Prisma.FloatFilter).lte = query.maxRent as number;
    }

    const [rows, total] = await Promise.all([
      prisma.room.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
        include: {
          images: imageSelect,
          property: {
            select: {
              id: true, name: true, city: true, state: true, addressLine1: true,
              foodEnabled: true, foodCharge: true,
              images: imageSelect,
            },
          },
        },
      }),
      prisma.room.count({ where }),
    ]);

    let items = rows.map((r) => {
      const food = effectiveFood(r, r.property);
      return {
        id: r.id,
        applicationsOpen: r.applicationsOpen,
        name: r.name,
        floor: r.floor,
        description: r.description,
        monthlyRent: Number(r.monthlyRent),
        securityDeposit: Number(r.securityDeposit),
        capacity: r.capacity,
        roommatesLimit: r.roommatesLimit,
        spotsAvailable: Math.max(0, r.capacity - r.occupantCount),
        amenities: r.amenities,
        food,
        images: r.images.map(publicImage),
        property: {
          id: r.property.id, name: r.property.name, city: r.property.city,
          state: r.property.state, addressLine1: r.property.addressLine1,
          images: r.property.images.map(publicImage),
        },
      };
    });
    if (query.foodEnabled) {
      const want = query.foodEnabled === 'true';
      items = items.filter((i) => i.food.foodEnabled === want);
    }
    return { items, meta: { page, pageSize, total } };
  },

  async browseOne(id: string) {
    const room = await prisma.room.findFirst({
      where: { id, status: { not: 'INACTIVE' }, property: { isActive: true } },
      include: { images: imageSelect, property: { include: { images: imageSelect } } },
    });
    if (!room) return null;
    return {
      id: room.id,
      applicationsOpen: room.applicationsOpen,
      name: room.name,
      floor: room.floor,
      description: room.description,
      monthlyRent: Number(room.monthlyRent),
      securityDeposit: Number(room.securityDeposit),
      capacity: room.capacity,
      roommatesLimit: room.roommatesLimit,
      spotsAvailable: Math.max(0, room.capacity - room.occupantCount),
      amenities: room.amenities,
      food: effectiveFood(room, room.property),
      images: room.images.map(publicImage),
      property: {
        id: room.property.id,
        name: room.property.name,
        addressLine1: room.property.addressLine1,
        city: room.property.city,
        state: room.property.state,
        images: room.property.images.map(publicImage),
      },
    };
  },
};
