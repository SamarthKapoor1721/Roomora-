import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  lease: { findMany: vi.fn() },
  payment: { upsert: vi.fn() },
}));

vi.mock('../../lib/prisma', () => ({ prisma: prismaMock }));

import { derivePaymentState, ensureCurrentMonthInvoiceForTenant } from './payments.service';

const base = {
  totalAmount: 10000,
  amountPaid: 0,
  dueDate: new Date('2026-01-05'),
  paidDate: null as Date | null,
  status: 'PENDING',
};

beforeEach(() => {
  vi.resetAllMocks();
  prismaMock.lease.findMany.mockResolvedValue([{ id: 'lease-1', monthlyRent: 15000, foodCharge: 300, rentDueDay: 5, startDate: new Date('2026-10-01') }]);
  prismaMock.payment.upsert.mockResolvedValue({ id: 'payment-1' });
});

describe('ensureCurrentMonthInvoiceForTenant', () => {
  it('creates the current month invoice for every active lease', async () => {
    await ensureCurrentMonthInvoiceForTenant('tenant-1');

    expect(prismaMock.lease.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', status: 'ACTIVE' },
      select: { id: true, monthlyRent: true, foodCharge: true, rentDueDay: true, startDate: true },
    });
    expect(prismaMock.payment.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        leaseId_periodYear_periodMonth: expect.objectContaining({ leaseId: 'lease-1' }),
      }),
      create: expect.objectContaining({ tenantId: 'tenant-1', rentAmount: 15000, foodAmount: 300 }),
    }));
  });
});

describe('derivePaymentState', () => {
  it('marks fully-paid on-time payments PAID with 0 days late', () => {
    const r = derivePaymentState({
      ...base,
      amountPaid: 10000,
      paidDate: new Date('2026-01-04'),
      status: 'PENDING',
    });
    expect(r.status).toBe('PAID');
    expect(r.daysLate).toBe(0);
  });

  it('records days late when a full payment lands after the due date', () => {
    const r = derivePaymentState({
      ...base,
      amountPaid: 10000,
      paidDate: new Date('2026-01-20'),
      status: 'PENDING',
    });
    expect(r.status).toBe('PAID');
    expect(r.daysLate).toBe(15);
  });

  it('is PARTIAL before the due date with a partial amount', () => {
    const future = new Date(Date.now() + 5 * 86_400_000);
    const r = derivePaymentState({ ...base, amountPaid: 4000, dueDate: future });
    expect(r.status).toBe('PARTIAL');
    expect(r.daysLate).toBe(0);
  });

  it('is OVERDUE after the due date when unpaid', () => {
    const past = new Date(Date.now() - 3 * 86_400_000);
    const r = derivePaymentState({ ...base, dueDate: past });
    expect(r.status).toBe('OVERDUE');
    expect(r.daysLate).toBe(3);
  });

  it('treats decimal installments as fully paid at currency precision', () => {
    const r = derivePaymentState({ ...base, totalAmount: 0.1 + 0.2, amountPaid: 0.3, paidDate: new Date('2026-01-04') });
    expect(r.status).toBe('PAID');
    expect(r.daysLate).toBe(0);
  });

  it('keeps WAIVED payments waived', () => {
    const r = derivePaymentState({ ...base, status: 'WAIVED' });
    expect(r.status).toBe('WAIVED');
    expect(r.daysLate).toBe(0);
  });
});
