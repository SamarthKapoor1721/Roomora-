import { z } from 'zod';

export const listLeasesQuery = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  status: z.enum(['ACTIVE', 'EXPIRED', 'TERMINATED', 'PENDING']).optional(),
  roomId: z.string().optional(),
  tenantId: z.string().optional(),
  expiringBefore: z.string().datetime().optional(),
});

export const updateLeaseSchema = z.object({
  endDate: z.coerce.date().optional(),
  monthlyRent: z.number().positive().optional(),
  foodCharge: z.number().nonnegative().optional(),
  securityDeposit: z.number().nonnegative().optional(),
  rentDueDay: z.number().int().min(1).max(28).optional(),
  status: z.enum(['ACTIVE', 'EXPIRED', 'TERMINATED', 'PENDING']).optional(),
  terms: z.string().max(8000).optional(),
});

export const idParam = z.object({ id: z.string().min(1) });
