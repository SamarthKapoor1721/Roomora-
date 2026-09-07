import { z } from 'zod';

const leaseTerms = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  rentDueDay: z.number().int().min(1).max(28).default(1),
  monthlyRent: z.number().positive().optional(),
  foodOptIn: z.boolean().optional(),
  terms: z.string().max(8000).optional(),
});

export const manualAssignSchema = z.object({
  tenantId: z.string().min(1),
  lease: leaseTerms,
});

export const endAssignmentSchema = z.object({
  reason: z.string().max(1000).optional(),
});

export const roomIdParam = z.object({ roomId: z.string().min(1) });
export const assignmentIdParam = z.object({ assignmentId: z.string().min(1) });
