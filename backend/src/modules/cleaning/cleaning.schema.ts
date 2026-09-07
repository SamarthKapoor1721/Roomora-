import { z } from 'zod';

export const createCleaningSchema = z.object({
  propertyId: z.string().min(1),
  roomId: z.string().min(1).optional(),
  title: z.string().min(3).max(160).trim(),
  description: z.string().max(2000).optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'ONE_TIME']).default('ONE_TIME'),
  scheduledFor: z.coerce.date(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
});

export const assignSchema = z.object({ staffId: z.string().min(1) });

export const ownerUpdateSchema = z.object({
  title: z.string().min(3).max(160).optional(),
  description: z.string().max(2000).optional(),
  scheduledFor: z.coerce.date().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  status: z.enum(['SCHEDULED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'MISSED']).optional(),
});

export const staffStatusSchema = z.object({
  status: z.enum(['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'MISSED']),
  notes: z.string().max(4000).optional(),
});

export const photoMetaSchema = z.object({
  kind: z.enum(['BEFORE', 'AFTER']).default('BEFORE'),
});

export const listQuery = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  status: z.enum(['SCHEDULED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'MISSED']).optional(),
  propertyId: z.string().optional(),
  staffId: z.string().optional(),
  completed: z.enum(['true', 'false']).optional(),
});

export const idParam = z.object({ id: z.string().min(1) });
