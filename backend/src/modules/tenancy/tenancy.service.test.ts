import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  roomAssignment: { findFirst: vi.fn(), update: vi.fn(), count: vi.fn(), create: vi.fn() },
  tenancyRequest: { findFirst: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
  room: { findFirst: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn() },
  lease: { findMany: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
  notification: { create: vi.fn() },
}));
vi.mock('../../lib/prisma', () => ({ prisma: { ...db, $transaction: (fn: (tx: typeof db) => unknown) => fn(db) } }));
import { tenancyService } from './tenancy.service';
import { createTenancyRequest } from './tenancy.routes';

const assignment = { id: 'assignment', tenantId: 'tenant', roomId: 'old', isActive: true, foodOptIn: false, room: { name: 'Old room', property: { ownerId: 'owner' } } };
beforeEach(() => {
  vi.resetAllMocks();
  db.roomAssignment.findFirst.mockResolvedValue(assignment);
  db.tenancyRequest.findFirst.mockResolvedValue(null);
  db.tenancyRequest.updateMany.mockResolvedValue({ count: 1 });
  db.room.findUniqueOrThrow.mockResolvedValue({ capacity: 2, roommatesLimit: 2, status: 'OCCUPIED', applicationsOpen: true });
  db.roomAssignment.count.mockResolvedValue(0);
  db.lease.findMany.mockResolvedValue([]);
});

describe('tenancy requests', () => {
  it('requires a target for a change and a nonblank reason', () => {
    expect(createTenancyRequest.safeParse({ assignmentId: 'a', type: 'CHANGE', reason: 'Move please' }).success).toBe(false);
    expect(createTenancyRequest.safeParse({ assignmentId: 'a', type: 'LEAVE', reason: '   ' }).success).toBe(false);
  });
  it('scopes creation to the requesting tenant and refuses missing assignments', async () => {
    db.roomAssignment.findFirst.mockResolvedValue(null);
    await expect(tenancyService.create('intruder', { assignmentId: 'assignment', type: 'LEAVE', reason: 'Leaving' })).rejects.toThrow('Active tenancy not found');
    expect(db.roomAssignment.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'assignment', tenantId: 'intruder', isActive: true } }));
    expect(db.tenancyRequest.create).not.toHaveBeenCalled();
  });
  it('rejects a second pending request', async () => {
    db.tenancyRequest.findFirst.mockResolvedValue({ id: 'existing' });
    await expect(tenancyService.create('tenant', { assignmentId: 'assignment', type: 'LEAVE', reason: 'Leaving' })).rejects.toThrow('already have a pending request');
    expect(db.tenancyRequest.create).not.toHaveBeenCalled();
  });
  it('rejects a room managed by another owner or closed to applications', async () => {
    db.room.findFirst.mockResolvedValue(null);
    await expect(tenancyService.create('tenant', { assignmentId: 'assignment', type: 'CHANGE', reason: 'More space', targetRoomId: 'other' })).rejects.toThrow('same owner');
    expect(db.room.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ property: { ownerId: 'owner', isActive: true }, applicationsOpen: true }) }));
  });
  it('does not allow another owner to review', async () => {
    await expect(tenancyService.review('intruder', 'request', { decision: 'APPROVE' })).rejects.toThrow('Request not found');
    expect(db.tenancyRequest.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'request', ownerId: 'intruder' } }));
    expect(db.roomAssignment.update).not.toHaveBeenCalled();
  });
  it('rejecting a request leaves assignments and leases untouched', async () => {
    db.tenancyRequest.findFirst.mockResolvedValue({ assignment, tenantId: 'tenant', type: 'LEAVE' });
    await tenancyService.review('owner', 'request', { decision: 'REJECT' });
    expect(db.roomAssignment.update).not.toHaveBeenCalled();
    expect(db.lease.updateMany).not.toHaveBeenCalled();
  });
  it('approving a leave ends the assignment and lease, frees the bed, and notifies', async () => {
    db.tenancyRequest.findFirst.mockResolvedValue({ assignment, tenantId: 'tenant', type: 'LEAVE' });
    await tenancyService.review('owner', 'request', { decision: 'APPROVE' });
    expect(db.roomAssignment.update).toHaveBeenCalledWith(expect.objectContaining({ data: { isActive: false, endDate: expect.any(Date) } }));
    expect(db.lease.updateMany).toHaveBeenCalledWith({ where: { tenantId: 'tenant', roomId: 'old', status: 'ACTIVE' }, data: { status: 'TERMINATED' } });
    expect(db.room.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ occupantCount: 0, status: 'AVAILABLE' }) }));
    expect(db.notification.create).toHaveBeenCalled();
  });
  it('rechecks target capacity at approval before ending the old tenancy', async () => {
    db.tenancyRequest.findFirst.mockResolvedValue({ assignment, tenantId: 'tenant', type: 'CHANGE', targetRoomId: 'target' });
    db.room.findFirst.mockResolvedValue({ id: 'target', capacity: 1, roommatesLimit: 1 });
    db.roomAssignment.count.mockResolvedValue(1);
    await expect(tenancyService.review('owner', 'request', { decision: 'APPROVE' })).rejects.toThrow('Target room is full');
    expect(db.roomAssignment.update).not.toHaveBeenCalled();
    expect(db.lease.create).not.toHaveBeenCalled();
  });
  it('creates the new tenancy at the target rent and preserves the lease end date', async () => {
    db.tenancyRequest.findFirst.mockResolvedValue({ assignment, tenantId: 'tenant', type: 'CHANGE', targetRoomId: 'target' });
    db.room.findFirst.mockResolvedValue({ id: 'target', capacity: 2, roommatesLimit: 2, monthlyRent: 12000, securityDeposit: 24000, foodEnabled: false, foodCharge: 0, property: { foodEnabled: false, foodCharge: 0 } });
    db.roomAssignment.findFirst.mockResolvedValue(null);
    const endDate = new Date('2099-01-01');
    db.lease.findMany.mockResolvedValue([{ endDate, rentDueDay: 5, terms: 'Existing terms' }]);
    await tenancyService.review('owner', 'request', { decision: 'APPROVE' });
    expect(db.lease.create).toHaveBeenCalledWith({ data: expect.objectContaining({ roomId: 'target', monthlyRent: 12000, securityDeposit: 24000, endDate, rentDueDay: 5 }) });
    expect(db.roomAssignment.update).toHaveBeenCalled();
  });
  it('does not process a cancelled or already reviewed request twice', async () => {
    db.tenancyRequest.findFirst.mockResolvedValue({ assignment, tenantId: 'tenant', type: 'LEAVE' });
    db.tenancyRequest.updateMany.mockResolvedValue({ count: 0 });
    await expect(tenancyService.review('owner', 'request', { decision: 'APPROVE' })).rejects.toThrow('already been reviewed or cancelled');
    expect(db.roomAssignment.update).not.toHaveBeenCalled();
  });
});
