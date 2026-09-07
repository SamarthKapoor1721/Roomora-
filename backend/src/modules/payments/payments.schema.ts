import { z } from 'zod';

const METHODS = ['CASH', 'BANK_TRANSFER', 'UPI', 'CARD', 'OTHER'] as const;

export const generatePeriodSchema = z.object({
  year: z.number().int().min(2020).max(2100).optional(),
  month: z.number().int().min(1).max(12).optional(),
});

export const recordPaymentSchema = z.object({
  amount: z.number().positive().max(100_000_000),
  method: z.enum(METHODS),
  reference: z.string().max(120).optional(),
  paidDate: z.coerce.date().optional(),
  notes: z.string().max(1000).optional(),
});

export const tenantPaySchema = z.object({
  amount: z.number().positive().max(100_000_000),
  method: z.enum(METHODS),
  reference: z.string().max(120).optional(),
});

export const adjustPaymentSchema = z.object({
  otherAmount: z.number().nonnegative().max(100_000_000).optional(),
  dueDate: z.coerce.date().optional(),
  status: z.enum(['PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'WAIVED']).optional(),
  notes: z.string().max(1000).optional(),
});

export const listPaymentsQuery = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  status: z.enum(['PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'WAIVED']).optional(),
  tenantId: z.string().optional(),
  leaseId: z.string().optional(),
  overdue: z.enum(['true', 'false']).optional(),
});

export const idParam = z.object({ id: z.string().min(1) });
export const leaseIdParam = z.object({ leaseId: z.string().min(1) });
