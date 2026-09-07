import { z } from 'zod';

export const createMaintenanceSchema = z.object({
  title: z.string().min(3).max(160).trim(),
  description: z.string().min(5).max(4000).trim(),
});

export const photoMetaSchema = z.object({
  kind: z.enum(['ISSUE', 'BEFORE', 'AFTER']).default('ISSUE'),
});

export const assignSchema = z.object({
  staffId: z.string().min(1),
});

export const ownerUpdateSchema = z.object({
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  category: z.string().max(80).optional(),
  status: z
    .enum(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'])
    .optional(),
});

export const noteSchema = z.object({
  body: z.string().min(1).max(4000).trim(),
});

export const staffStatusSchema = z.object({
  status: z.enum(['ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED']),
  resolutionNotes: z.string().max(4000).optional(),
});

export const listQuery = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  status: z
    .enum(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'])
    .optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  roomId: z.string().optional(),
  staffId: z.string().optional(),
  completed: z.enum(['true', 'false']).optional(),
});

export const idParam = z.object({ id: z.string().min(1) });
