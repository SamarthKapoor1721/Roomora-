import { beforeEach, describe, expect, it, vi } from 'vitest';

const tx = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  roomAssignment: { findMany: vi.fn(), updateMany: vi.fn(), count: vi.fn() },
  tenancyRequest: { updateMany: vi.fn() },
  application: { updateMany: vi.fn() },
  lease: { updateMany: vi.fn() },
  room: { findUnique: vi.fn(), update: vi.fn() },
  notification: { create: vi.fn() },
}));
vi.mock('../../lib/prisma', () => ({ prisma: { $transaction: (fn: (client: typeof tx) => unknown) => fn(tx) } }));
import { resetTenantForAllocation } from './admin.service';

describe('resetTenantForAllocation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tx.user.findUnique.mockResolvedValue({ id: 'tenant-1', role: 'TENANT', isActive: true });
    tx.roomAssignment.findMany.mockResolvedValue([{ id: 'assignment-1', roomId: 'room-1' }]);
    tx.room.findUnique.mockResolvedValue({ status: 'FULL', capacity: 1, occupantCount: 1 });
    tx.roomAssignment.count.mockResolvedValue(0);
  });

  it('ends active tenancy, keeps records, and frees the room', async () => {
    const result = await resetTenantForAllocation('tenant-1');
    expect(result).toEqual({ tenantId: 'tenant-1', endedAssignments: 1 });
    expect(tx.roomAssignment.updateMany).toHaveBeenCalledWith({ where: { tenantId: 'tenant-1', isActive: true }, data: { isActive: false, endDate: expect.any(Date) } });
    expect(tx.lease.updateMany).toHaveBeenCalledWith({ where: { tenantId: 'tenant-1', status: 'ACTIVE' }, data: { status: 'TERMINATED' } });
    expect(tx.application.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'WITHDRAWN' } }));
    expect(tx.tenancyRequest.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'CANCELLED' }) }));
    expect(tx.room.update).toHaveBeenCalledWith({ where: { id: 'room-1' }, data: { occupantCount: 0, status: 'AVAILABLE' } });
  });

  it('rejects a tenant without an active assignment', async () => {
    tx.roomAssignment.findMany.mockResolvedValue([]);
    await expect(resetTenantForAllocation('tenant-1')).rejects.toThrow('no active room assignment');
    expect(tx.lease.updateMany).not.toHaveBeenCalled();
  });
});
