import type { Prisma } from '@prisma/client';
import { ownerPropertyOrThrow } from '../../lib/access';
import { prisma } from '../../lib/prisma';
import { parsePage } from '../../lib/pagination';
import type { z } from 'zod';
import type {
  createPropertySchema,
  listPropertiesQuery,
  updatePropertySchema,
} from './properties.schema';

type CreateInput = z.infer<typeof createPropertySchema>;
type UpdateInput = z.infer<typeof updatePropertySchema>;
type ListQuery = z.infer<typeof listPropertiesQuery>;

export const propertiesService = {
  async create(ownerId: string, input: CreateInput) {
    return prisma.property.create({
      data: { ...input, ownerId, foodCharge: input.foodCharge },
    });
  },

  async list(ownerId: string, query: ListQuery) {
    const { skip, take, page, pageSize } = parsePage(query);
    const where: Prisma.PropertyWhereInput = { ownerId };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
        { addressLine1: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.isActive) where.isActive = query.isActive === 'true';

    const [items, total] = await Promise.all([
      prisma.property.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { rooms: true } },
          rooms: { select: { status: true, occupantCount: true, capacity: true, applicationsOpen: true } },
        },
      }),
      prisma.property.count({ where }),
    ]);

    const shaped = items.map(({ rooms, ...p }) => ({
      ...p,
      roomCount: rooms.length,
      totalCapacity: rooms.reduce((s, r) => s + r.capacity, 0),
      totalOccupants: rooms.reduce((s, r) => s + r.occupantCount, 0),
      openForApplications: rooms.filter((r) => r.applicationsOpen).length,
    }));

    return { items: shaped, meta: { page, pageSize, total } };
  },

  async get(ownerId: string, id: string) {
    await ownerPropertyOrThrow(ownerId, id);
    return prisma.property.findUnique({
      where: { id },
      include: {
        rooms: {
          orderBy: { name: 'asc' },
          include: { _count: { select: { applications: true, assignments: true } } },
        },
      },
    });
  },

  async update(ownerId: string, id: string, input: UpdateInput) {
    await ownerPropertyOrThrow(ownerId, id);
    return prisma.property.update({ where: { id }, data: input });
  },

  async remove(ownerId: string, id: string) {
    await ownerPropertyOrThrow(ownerId, id);
    // Soft-delete to preserve history; deactivates rooms too.
    await prisma.$transaction([
      prisma.room.updateMany({ where: { propertyId: id }, data: { status: 'INACTIVE', applicationsOpen: false } }),
      prisma.property.update({ where: { id }, data: { isActive: false } }),
    ]);
  },
};
