import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  application: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  roomAssignment: { count: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
  room: { findUnique: vi.fn(), update: vi.fn() },
  lease: { create: vi.fn() },
  payment: { findUnique: vi.fn(), create: vi.fn() },
}));

vi.mock('../../lib/prisma', () => ({
  prisma: { ...db, $transaction: (fn: (tx: typeof db) => unknown) => fn(db) },
}));

import { assignmentsService } from './assignments.service';

beforeEach(() => {
  vi.resetAllMocks();
  db.application.findUnique.mockResolvedValue({
    id: 'app-1',
    tenantId: 'tenant-1',
    status: 'OWNER_REVIEW',
    foodOptIn: false,
    room: {
      id: 'room-1',
      name: 'Room 101',
      capacity: 2,
      roommatesLimit: 2,
      monthlyRent: 15000,
      securityDeposit: 3000,
      property: { ownerId: 'owner-1', foodEnabled: false, foodCharge: 0 },
    },
    tenant: { id: 'tenant-1', fullName: 'Test Tenant' },
  });
  db.roomAssignment.count.mockResolvedValue(0);
  db.roomAssignment.findFirst.mockResolvedValue(null);
  db.roomAssignment.create.mockResolvedValue({ id: 'assignment-1' });
  db.lease.create.mockResolvedValue({ id: 'lease-1', tenantId: 'tenant-1', roomId: 'room-1', monthlyRent: 15000, foodCharge: 0, rentDueDay: 5, startDate: new Date('2026-10-01'), endDate: new Date('2027-10-01') });
  db.payment.findUnique.mockResolvedValue(null);
  db.room.findUnique.mockResolvedValue({ id: 'room-1', status: 'AVAILABLE', capacity: 2, applicationsOpen: true });
  db.room.update.mockResolvedValue({ id: 'room-1' });
  db.application.update.mockResolvedValue({ id: 'app-1' });
});

describe('assignmentsService', () => {
  it('creates an initial payment invoice when approving an application', async () => {
    const startDate = new Date('2026-10-15T00:00:00.000Z');
    const endDate = new Date('2027-10-14T00:00:00.000Z');

    await assignmentsService.assignFromApplication('owner-1', {
      applicationId: 'app-1',
      lease: {
        startDate,
        endDate,
        rentDueDay: 5,
        foodOptIn: false,
      },
    });

    expect(db.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        leaseId: 'lease-1',
        tenantId: 'tenant-1',
        periodMonth: 10,
        periodYear: 2026,
        rentAmount: 15000,
        totalAmount: 15000,
        status: 'PENDING',
      }),
    });
  });
});
