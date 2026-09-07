import { z } from 'zod';

export const createStaffSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8).max(128).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/),
  fullName: z.string().min(2).max(120).trim(),
  phone: z.string().min(6).max(20).optional(),
  staffType: z.enum(['MAINTENANCE', 'CLEANING', 'GENERAL']),
  skills: z.array(z.string().max(60)).max(40).optional(),
});

export const updateStaffSchema = z.object({
  fullName: z.string().min(2).max(120).optional(),
  phone: z.string().min(6).max(20).optional(),
  staffType: z.enum(['MAINTENANCE', 'CLEANING', 'GENERAL']).optional(),
  skills: z.array(z.string().max(60)).max(40).optional(),
  isActive: z.boolean().optional(),
});

export const listStaffQuery = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  staffType: z.enum(['MAINTENANCE', 'CLEANING', 'GENERAL']).optional(),
  isActive: z.enum(['true', 'false']).optional(),
});

export const idParam = z.object({ id: z.string().min(1) });
