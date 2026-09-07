import { z } from 'zod';

export const listWarningsQuery = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  status: z.enum(['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED']).optional(),
  type: z
    .enum([
      'RENT_UPCOMING',
      'RENT_OVERDUE',
      'REPEATED_LATE_PAYMENT',
      'LEASE_EXPIRY',
      'MISSING_DOCUMENTS',
      'MAINTENANCE_DELAY',
      'CLEANING_DELAY',
      'MANUAL',
    ])
    .optional(),
  tenantId: z.string().optional(),
});

export const createWarningSchema = z.object({
  tenantId: z.string().min(1),
  title: z.string().min(3).max(160).trim(),
  message: z.string().min(3).max(4000).trim(),
  severity: z.enum(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
});

export const updateStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED']),
});

export const idParam = z.object({ id: z.string().min(1) });
