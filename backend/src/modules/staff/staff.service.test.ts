import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../lib/prisma';
import { staffService } from './staff.service';

vi.mock('../../lib/prisma', () => ({ prisma: {
  user: { findFirst: vi.fn(), create: vi.fn() },
  staffProfile: { findFirst: vi.fn() },
} }));
vi.mock('../../lib/auth', () => ({ hashPassword: vi.fn().mockResolvedValue('hashed-password') }));
vi.mock('../../lib/notify', () => ({ notify: vi.fn().mockResolvedValue(undefined) }));

beforeEach(() => vi.clearAllMocks());

describe('staff creation', () => {
  it('generates a numeric worker ID and returns it to the owner', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.staffProfile.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockImplementation(async (args) => ({
      id: 'staff-1', fullName: 'Test Cleaner', phone: '9876543210',
      staffType: 'CLEANING', isActive: true,
      staffProfile: { workerId: args.data.staffProfile?.create?.workerId, skills: [] },
    }) as never);

    const result = await staffService.create('owner-1', {
      fullName: 'Test Cleaner', phone: '9876543210', password: 'StrongPass123', staffType: 'CLEANING',
    });

    expect(result.workerId).toMatch(/^\d{8}$/);
    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ staffProfile: { create: expect.objectContaining({ workerId: result.workerId }) } }),
    }));
    expect(prisma.staffProfile.findFirst).toHaveBeenCalledWith({ where: { workerId: result.workerId } });
  });
});
