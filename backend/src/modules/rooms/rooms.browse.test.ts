import { describe, expect, it, vi } from 'vitest';
const db = vi.hoisted(() => ({ room: { findMany: vi.fn(), count: vi.fn() } }));
vi.mock('../../lib/prisma', () => ({ prisma: db }));
import { roomsService } from './rooms.service';

describe('tenant room visibility', () => {
  it('returns a closed room with its application state without filtering it out', async () => {
    db.room.findMany.mockResolvedValue([{ id: 'new-room', name: 'CHECK 1', applicationsOpen: false, capacity: 1, occupantCount: 0, monthlyRent: 20000, securityDeposit: 0, amenities: [], images: [], foodEnabled: false, foodCharge: 0, property: { id: 'new-property', name: 'GREEN CITY', images: [], foodEnabled: false, foodCharge: 0 } }]);
    db.room.count.mockResolvedValue(1);
    const result = await roomsService.browse({});
    expect(result.items[0]).toMatchObject({ id: 'new-room', applicationsOpen: false, spotsAvailable: 1, property: { name: 'GREEN CITY' } });
    const where = db.room.findMany.mock.calls[0][0].where;
    expect(where.applicationsOpen).toBeUndefined();
    expect(where.property).toEqual({ isActive: true });
    expect(where.status.in).not.toContain('INACTIVE');
  });
});
