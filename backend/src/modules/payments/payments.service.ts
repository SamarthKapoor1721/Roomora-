import type { PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors';
import { notify } from '../../lib/notify';
import { parsePage } from '../../lib/pagination';
import { prisma } from '../../lib/prisma';

function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / 86_400_000);
}

/** Derives a payment's status + daysLate from its amounts and dates. */
export function derivePaymentState(p: {
  totalAmount: number;
  amountPaid: number;
  dueDate: Date;
  paidDate: Date | null;
  status: string;
}): { status: PaymentStatus; daysLate: number } {
  if (p.status === 'WAIVED') return { status: 'WAIVED', daysLate: 0 };
  const now = new Date();
  if (roundMoney(p.amountPaid) >= roundMoney(p.totalAmount) && p.totalAmount > 0) {
    const ref = p.paidDate ?? now;
    return { status: 'PAID', daysLate: Math.max(0, daysBetween(ref, p.dueDate)) };
  }
  if (p.amountPaid > 0) {
    return {
      status: now > p.dueDate ? 'OVERDUE' : 'PARTIAL',
      daysLate: now > p.dueDate ? daysBetween(now, p.dueDate) : 0,
    };
  }
  return now > p.dueDate
    ? { status: 'OVERDUE', daysLate: daysBetween(now, p.dueDate) }
    : { status: 'PENDING', daysLate: 0 };
}

async function ownerPaymentOrThrow(ownerId: string, id: string) {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { lease: { include: { room: { include: { property: true } } } } },
  });
  if (!payment) throw notFound('Payment not found');
  if (payment.lease.room.property.ownerId !== ownerId) throw forbidden('Not your payment record');
  return payment;
}

type PaymentInput = { amount: number; method: string; reference?: string; paidDate?: Date; notes?: string };

/** Compare-and-set the balance and status together; retry if another writer wins. */
async function recordInvoicePayment(actorId: string, role: 'OWNER' | 'TENANT', id: string, input: PaymentInput) {
  const amount = roundMoney(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw badRequest('Amount must be at least 0.01');

  for (let attempt = 0; attempt < 5; attempt++) {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { lease: { include: { room: { include: { property: true } } } } },
    });
    if (!payment) throw notFound('Payment not found');
    if (role === 'OWNER' ? payment.lease.room.property.ownerId !== actorId : payment.tenantId !== actorId) {
      throw forbidden('Not your payment record');
    }
    const outstanding = roundMoney(Number(payment.totalAmount) - Number(payment.amountPaid));
    if (payment.status === 'WAIVED' || payment.status === 'PAID' || outstanding <= 0) {
      throw conflict('Nothing to pay for this period');
    }
    if (amount > outstanding) throw badRequest(`Amount exceeds the outstanding balance of ${outstanding.toFixed(2)}`);

    const newPaid = roundMoney(Number(payment.amountPaid) + amount);
    const paidDate = input.paidDate ?? new Date();
    const state = derivePaymentState({
      totalAmount: Number(payment.totalAmount),
      amountPaid: newPaid,
      dueDate: payment.dueDate,
      paidDate: newPaid >= Number(payment.totalAmount) ? paidDate : null,
      status: payment.status,
    });
    const data = {
      amountPaid: newPaid,
      paidDate: newPaid >= Number(payment.totalAmount) ? paidDate : payment.paidDate,
      method: input.method as PaymentMethod,
      reference: input.reference ?? payment.reference,
      notes: input.notes ?? payment.notes,
      status: state.status,
      daysLate: state.daysLate,
      updatedAt: new Date(),
    };
    const result = await prisma.payment.updateMany({
      where: {
        id,
        amountPaid: payment.amountPaid,
        totalAmount: payment.totalAmount,
        status: payment.status,
        dueDate: payment.dueDate,
      },
      data,
    });
    if (!result.count) continue;

    const { lease, ...invoice } = payment;
    const updated = { ...invoice, ...data };
    await notify({
      userId: role === 'OWNER' ? payment.tenantId : lease.room.property.ownerId,
      type: 'PAYMENT_REMINDER',
      title: role === 'OWNER' ? 'Payment recorded' : 'Tenant made a payment',
      body: `A payment of ${amount.toFixed(2)} was recorded for ${payment.periodMonth}/${payment.periodYear} via ${input.method}. Outstanding: ${roundMoney(outstanding - amount).toFixed(2)}.`,
      relatedType: 'PAYMENT',
      relatedId: id,
    });
    return updated;
  }
  throw conflict('The invoice changed while recording your payment. Please try again.');
}

export async function ensureCurrentMonthInvoiceForTenant(tenantId: string, year?: number, month?: number) {
  const now = new Date();
  const currentYear = year ?? now.getUTCFullYear();
  const currentMonth = month ?? now.getUTCMonth() + 1;

  const activeLeases = await prisma.lease.findMany({
    where: { tenantId, status: 'ACTIVE' },
    select: { id: true, monthlyRent: true, foodCharge: true, rentDueDay: true, startDate: true },
  });

  if (!activeLeases.length) return [];

  const results = await Promise.allSettled(
    activeLeases.map(async (lease) => {
      const dueDay = Math.min(lease.rentDueDay, 28);
      const dueDate = new Date(Date.UTC(currentYear, currentMonth - 1, dueDay, 0, 0, 0));
      const totalAmount = roundMoney(Number(lease.monthlyRent) + Number(lease.foodCharge ?? 0));
      return prisma.payment.upsert({
        where: {
          leaseId_periodYear_periodMonth: {
            leaseId: lease.id,
            periodYear: currentYear,
            periodMonth: currentMonth,
          },
        },
        update: {},
        create: {
          leaseId: lease.id,
          tenantId,
          periodMonth: currentMonth,
          periodYear: currentYear,
          rentAmount: Number(lease.monthlyRent),
          foodAmount: Number(lease.foodCharge ?? 0),
          otherAmount: 0,
          totalAmount,
          dueDate,
          status: 'PENDING',
        },
      });
    }),
  );

  return results.filter((result) => result.status === 'fulfilled').map((result) => (result as PromiseFulfilledResult<unknown>).value);
}

export const paymentsService = {
  /**
   * Generate the invoice for a lease for a given month/year.
   * Idempotent thanks to the (leaseId, year, month) unique constraint.
   * Verifies the lease belongs to ownerId before generating.
   */
  async generateForPeriod(ownerId: string, leaseId: string, year: number, month: number) {
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: { room: { include: { property: true } } },
    });
    if (!lease) throw notFound('Lease not found');
    if (lease.room.property.ownerId !== ownerId) throw forbidden('Not your lease');
    if (lease.status !== 'ACTIVE') throw conflict('Lease is not active');

    const existing = await prisma.payment.findUnique({
      where: { leaseId_periodYear_periodMonth: { leaseId, periodYear: year, periodMonth: month } },
    });
    if (existing) return existing;

    const rent = Number(lease.monthlyRent);
    const food = Number(lease.foodCharge);
    const dueDay = Math.min(lease.rentDueDay, 28);
    const dueDate = new Date(Date.UTC(year, month - 1, dueDay, 0, 0, 0));

    return prisma.payment.create({
      data: {
        leaseId,
        tenantId: lease.tenantId,
        periodMonth: month,
        periodYear: year,
        rentAmount: rent,
        foodAmount: food,
        otherAmount: 0,
        totalAmount: roundMoney(rent + food),
        dueDate,
        status: 'PENDING',
      },
    });
  },

  /** Bulk-generate the current month's invoices for all of an owner's active leases. */
  async generateCurrentMonthForOwner(ownerId: string, year?: number, month?: number) {
    const now = new Date();
    const y = year ?? now.getUTCFullYear();
    const m = month ?? now.getUTCMonth() + 1;
    const leases = await prisma.lease.findMany({
      where: { status: 'ACTIVE', room: { property: { ownerId } } },
      select: { id: true },
    });
    const results = await Promise.allSettled(
      leases.map((l) => this.generateForPeriod(ownerId, l.id, y, m)),
    );
    const created = results.filter((r) => r.status === 'fulfilled').length;
    return { period: { year: y, month: m }, leases: leases.length, processed: created };
  },

  async recordPayment(
    ownerId: string,
    id: string,
    input: { amount: number; method: string; reference?: string; paidDate?: Date; notes?: string },
  ) {
    return recordInvoicePayment(ownerId, 'OWNER', id, input);
  },

  async adjust(
    ownerId: string,
    id: string,
    input: { otherAmount?: number; dueDate?: Date; status?: string; notes?: string },
  ) {
    const payment = await ownerPaymentOrThrow(ownerId, id);
    const other = input.otherAmount ?? Number(payment.otherAmount);
    const total = roundMoney(Number(payment.rentAmount) + Number(payment.foodAmount) + other);
    let data: Prisma.PaymentUpdateInput = {
      otherAmount: other,
      totalAmount: total,
      dueDate: input.dueDate ?? payment.dueDate,
      notes: input.notes ?? payment.notes,
    };
    if (input.status === 'WAIVED') {
      data = { ...data, status: 'WAIVED', daysLate: 0 };
    } else {
      const state = derivePaymentState({
        totalAmount: total,
        amountPaid: Number(payment.amountPaid),
        dueDate: (input.dueDate ?? payment.dueDate) as Date,
        paidDate: payment.paidDate,
        status: input.status ?? payment.status,
      });
      data = { ...data, status: state.status, daysLate: state.daysLate };
    }
    return prisma.payment.update({ where: { id }, data });
  },

  async listForOwner(ownerId: string, query: Record<string, unknown>) {
    const { skip, take, page, pageSize } = parsePage(query);
    const where: Prisma.PaymentWhereInput = { lease: { room: { property: { ownerId } } } };
    if (query.status) where.status = query.status as never;
    if (query.tenantId) where.tenantId = query.tenantId as string;
    if (query.leaseId) where.leaseId = query.leaseId as string;
    if (query.overdue === 'true') where.status = 'OVERDUE';

    const [items, total, aggregate] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take,
        orderBy: [{ dueDate: 'desc' }],
        include: {
          tenant: { select: { id: true, fullName: true, email: true } },
          lease: { select: { id: true, room: { select: { id: true, name: true } } } },
        },
      }),
      prisma.payment.count({ where }),
      prisma.payment.aggregate({
        where,
        _sum: { totalAmount: true, amountPaid: true },
      }),
    ]);

    const outstanding =
      Number(aggregate._sum.totalAmount ?? 0) - Number(aggregate._sum.amountPaid ?? 0);
    return {
      items,
      meta: { page, pageSize, total },
      summary: {
        billed: Number(aggregate._sum.totalAmount ?? 0),
        collected: Number(aggregate._sum.amountPaid ?? 0),
        outstanding: Math.max(0, outstanding),
      },
    };
  },

  async listForTenant(tenantId: string, query: Record<string, unknown>) {
    await ensureCurrentMonthInvoiceForTenant(tenantId);
    const { skip, take, page, pageSize } = parsePage(query);
    const where: Prisma.PaymentWhereInput = { tenantId };
    if (query.status) where.status = query.status as never;

    const [items, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take,
        orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
        include: { lease: { select: { id: true, room: { select: { name: true } } } } },
      }),
      prisma.payment.count({ where }),
    ]);
    return { items, meta: { page, pageSize, total } };
  },

  /** Tenant self-pay (records intent; owner still sees method/reference). */
  async tenantPay(
    tenantId: string,
    id: string,
    input: { amount: number; method: string; reference?: string },
  ) {
    return recordInvoicePayment(tenantId, 'TENANT', id, input);
  },
};
