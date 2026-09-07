import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hash(pw: string) {
  return bcrypt.hash(pw, 12);
}

async function main() {
  console.log('Seeding database...');

  const password = await hash('Password123');

  // ---- Users ----
  const owner = await prisma.user.upsert({
    where: { email: 'owner@srms.test' },
    update: {},
    create: { email: 'owner@srms.test', passwordHash: password, fullName: 'Olivia Owner', role: 'OWNER', phone: '9990001111' },
  });

  const tenant1 = await prisma.user.upsert({
    where: { email: 'tenant@srms.test' },
    update: {},
    create: { email: 'tenant@srms.test', passwordHash: password, fullName: 'Tom Tenant', role: 'TENANT', phone: '9990002222' },
  });
  const tenant2 = await prisma.user.upsert({
    where: { email: 'tenant2@srms.test' },
    update: {},
    create: { email: 'tenant2@srms.test', passwordHash: password, fullName: 'Tina Tenant', role: 'TENANT', phone: '9990003333' },
  });

  const staffMaint = await prisma.user.upsert({
    where: { email: 'maintenance@srms.test' },
    update: {},
    create: {
      email: 'maintenance@srms.test',
      passwordHash: password,
      fullName: 'Max Maintenance',
      role: 'STAFF',
      staffType: 'MAINTENANCE',
      phone: '9990004444',
      staffProfile: { create: { ownerId: owner.id, staffType: 'MAINTENANCE', skills: ['plumbing', 'electrical'] } },
    },
  });
  const staffClean = await prisma.user.upsert({
    where: { email: 'cleaning@srms.test' },
    update: {},
    create: {
      email: 'cleaning@srms.test',
      passwordHash: password,
      fullName: 'Cleo Cleaner',
      role: 'STAFF',
      staffType: 'CLEANING',
      phone: '9990005555',
      staffProfile: { create: { ownerId: owner.id, staffType: 'CLEANING', skills: ['deep-clean'] } },
    },
  });

  // ---- Property + rooms ----
  const existingProp = await prisma.property.findFirst({ where: { ownerId: owner.id, name: 'Maple Residency' } });
  const property =
    existingProp ??
    (await prisma.property.create({
      data: {
        ownerId: owner.id,
        name: 'Maple Residency',
        addressLine1: '12 Maple Street',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560001',
        foodEnabled: true,
        foodCharge: 3000,
        description: 'Co-living building near the tech park.',
      },
    }));

  let roomA = await prisma.room.findFirst({ where: { propertyId: property.id, name: 'Room 101' } });
  if (!roomA) {
    roomA = await prisma.room.create({
      data: {
        propertyId: property.id,
        name: 'Room 101',
        floor: '1',
        monthlyRent: 15000,
        securityDeposit: 30000,
        capacity: 2,
        roommatesLimit: 2,
        applicationsOpen: true,
        foodEnabled: true,
        foodCharge: 3000,
        amenities: ['AC', 'Attached bathroom', 'Wi-Fi'],
      },
    });
  }

  let roomB = await prisma.room.findFirst({ where: { propertyId: property.id, name: 'Room 102' } });
  if (!roomB) {
    roomB = await prisma.room.create({
      data: {
        propertyId: property.id,
        name: 'Room 102',
        floor: '1',
        monthlyRent: 11000,
        securityDeposit: 22000,
        capacity: 3,
        roommatesLimit: 3,
        applicationsOpen: true,
        amenities: ['Fan', 'Shared bathroom', 'Wi-Fi'],
      },
    });
  }

  // ---- An assigned tenant with a lease + payments ----
  const existingAssignment = await prisma.roomAssignment.findFirst({
    where: { tenantId: tenant2.id, roomId: roomA.id, isActive: true },
  });
  if (!existingAssignment) {
    await prisma.$transaction(async (tx) => {
      await tx.roomAssignment.create({
        data: {
          roomId: roomA!.id,
          tenantId: tenant2.id,
          startDate: new Date('2025-06-01'),
          endDate: new Date('2026-05-31'),
          foodOptIn: true,
        },
      });
      const lease = await tx.lease.create({
        data: {
          roomId: roomA!.id,
          tenantId: tenant2.id,
          startDate: new Date('2025-06-01'),
          endDate: new Date('2026-05-31'),
          monthlyRent: 15000,
          foodCharge: 3000,
          securityDeposit: 30000,
          rentDueDay: 5,
          status: 'ACTIVE',
          terms: 'Standard 12-month lease. One month notice for termination.',
        },
      });
      await tx.room.update({
        where: { id: roomA!.id },
        data: { occupantCount: 1, status: 'OCCUPIED' },
      });
      // A paid month and an overdue month
      await tx.payment.create({
        data: {
          leaseId: lease.id,
          tenantId: tenant2.id,
          periodMonth: 7,
          periodYear: 2025,
          rentAmount: 15000,
          foodAmount: 3000,
          totalAmount: 18000,
          amountPaid: 18000,
          dueDate: new Date('2025-07-05'),
          paidDate: new Date('2025-07-04'),
          status: 'PAID',
          method: 'UPI',
        },
      });
      await tx.payment.create({
        data: {
          leaseId: lease.id,
          tenantId: tenant2.id,
          periodMonth: 8,
          periodYear: 2025,
          rentAmount: 15000,
          foodAmount: 3000,
          totalAmount: 18000,
          amountPaid: 0,
          dueDate: new Date('2025-08-05'),
          daysLate: 33,
          status: 'OVERDUE',
        },
      });
    });
  }

  // ---- A maintenance request from the assigned tenant ----
  const existingMaint = await prisma.maintenanceRequest.findFirst({ where: { tenantId: tenant2.id } });
  if (!existingMaint) {
    await prisma.maintenanceRequest.create({
      data: {
        roomId: roomA.id,
        tenantId: tenant2.id,
        title: 'AC not cooling',
        description: 'The air conditioner runs but only blows warm air. Started yesterday evening.',
        category: 'HVAC',
        priority: 'MEDIUM',
        aiSource: 'RULE_BASED_FALLBACK',
        status: 'OPEN',
      },
    });
  }

  // ---- A cleaning task ----
  const existingClean = await prisma.cleaningTask.findFirst({ where: { propertyId: property.id } });
  if (!existingClean) {
    await prisma.cleaningTask.create({
      data: {
        propertyId: property.id,
        roomId: roomB.id,
        title: 'Weekly common-area cleaning',
        frequency: 'WEEKLY',
        scheduledFor: new Date(Date.now() + 2 * 86_400_000),
        priority: 'MEDIUM',
        status: 'SCHEDULED',
      },
    });
  }

  console.log('Seed complete.');
  console.log('\nLogins (password: Password123):');
  console.log('  Owner:       owner@srms.test');
  console.log('  Tenant:      tenant@srms.test  (no room yet — can apply)');
  console.log('  Tenant 2:    tenant2@srms.test (assigned to Room 101, has overdue rent)');
  console.log('  Maintenance: maintenance@srms.test');
  console.log('  Cleaning:    cleaning@srms.test');
  void tenant1;
  void staffMaint;
  void staffClean;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
