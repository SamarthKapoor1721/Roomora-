import { forbidden, notFound } from './errors';
import { prisma } from './prisma';

/** Load a room and assert the given owner owns its property. */
export async function ownerRoomOrThrow(ownerId: string, roomId: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { property: true },
  });
  if (!room) throw notFound('Room not found');
  if (room.property.ownerId !== ownerId) throw forbidden('You do not own this room');
  return room;
}

export async function ownerPropertyOrThrow(ownerId: string, propertyId: string) {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) throw notFound('Property not found');
  if (property.ownerId !== ownerId) throw forbidden('You do not own this property');
  return property;
}

/** Assert an owner has authority over an application (owns the room's property). */
export async function ownerApplicationOrThrow(ownerId: string, applicationId: string) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      room: { include: { property: true } },
      tenant: { select: { id: true, fullName: true, email: true, phone: true } },
      documents: true,
      eligibility: true,
      docVerification: true,
      summary: true,
    },
  });
  if (!application) throw notFound('Application not found');
  if (application.room.property.ownerId !== ownerId) {
    throw forbidden('You do not have access to this application');
  }
  return application;
}

/** Owner -> staff they manage. */
export async function ownerStaffOrThrow(ownerId: string, staffUserId: string) {
  const profile = await prisma.staffProfile.findUnique({
    where: { userId: staffUserId },
    include: { user: true },
  });
  if (!profile) throw notFound('Staff member not found');
  if (profile.ownerId !== ownerId) throw forbidden('This staff member is not on your team');
  return profile;
}

/** Every ownerId that a tenant is (or was) connected to via assignments/leases. */
export async function tenantOwnerIds(tenantId: string): Promise<string[]> {
  const rows = await prisma.room.findMany({
    where: {
      OR: [
        { assignments: { some: { tenantId } } },
        { leases: { some: { tenantId } } },
        { applications: { some: { tenantId } } },
      ],
    },
    select: { property: { select: { ownerId: true } } },
  });
  return [...new Set(rows.map((r) => r.property.ownerId))];
}
