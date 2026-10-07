import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/prisma', () => ({
  prisma: {
    property: { findMany: vi.fn() },
    room: { findMany: vi.fn() },
    roomAssignment: { findMany: vi.fn() },
    application: { findMany: vi.fn() },
    warning: { findMany: vi.fn(), count: vi.fn() },
    user: { findMany: vi.fn() },
  },
}));

import { prisma } from '../../lib/prisma';
import { warningsService } from './warnings.service';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.property.findMany).mockResolvedValue([{ id: 'property-1' }] as never);
  vi.mocked(prisma.room.findMany).mockResolvedValue([{ id: 'room-1' }] as never);
  vi.mocked(prisma.roomAssignment.findMany).mockResolvedValue([{ tenantId: 'tenant-1' }] as never);
  vi.mocked(prisma.application.findMany).mockResolvedValue([{ tenantId: 'tenant-1' }, { tenantId: 'tenant-2' }] as never);
  vi.mocked(prisma.warning.findMany).mockResolvedValue([{ id: 'warning-1', tenantId: 'tenant-1' }] as never);
  vi.mocked(prisma.warning.count).mockResolvedValue(1);
  vi.mocked(prisma.user.findMany).mockResolvedValue([{ id: 'tenant-1', fullName: 'Tenant One', email: 'one@example.test' }] as never);
});

describe('owner warnings', () => {
  it('filters by scalar tenant IDs and includes tenant names without nested Mongo relation filters', async () => {
    const result = await warningsService.listForOwner('owner-1', { status: 'ACTIVE' });

    expect(prisma.warning.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        OR: [{ issuedById: 'owner-1' }, { tenantId: { in: ['tenant-1', 'tenant-2'] } }],
        status: 'ACTIVE',
      },
    }));
    expect(result.items[0].tenant?.fullName).toBe('Tenant One');
    expect(result.meta.total).toBe(1);
  });

  it('still lists warnings issued by owners without properties', async () => {
    vi.mocked(prisma.property.findMany).mockResolvedValue([]);
    vi.mocked(prisma.warning.findMany).mockResolvedValue([{ id: 'manual-1', tenantId: null }] as never);

    const result = await warningsService.listForOwner('owner-1', {});

    expect(prisma.room.findMany).not.toHaveBeenCalled();
    expect(prisma.warning.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { OR: [{ issuedById: 'owner-1' }] },
    }));
    expect(result.items[0].tenant).toBeNull();
  });
});
