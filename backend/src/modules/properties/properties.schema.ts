import { z } from 'zod';

export const createPropertySchema = z.object({
  name: z.string().min(2).max(160).trim(),
  addressLine1: z.string().min(3).max(200).trim(),
  addressLine2: z.string().max(200).trim().optional(),
  city: z.string().min(2).max(100).trim(),
  state: z.string().max(100).trim().optional(),
  postalCode: z.string().max(20).trim().optional(),
  country: z.string().max(100).trim().default('India'),
  description: z.string().max(2000).optional(),
  foodEnabled: z.boolean().default(false),
  foodCharge: z.number().nonnegative().max(1_000_000).default(0),
});

export const updatePropertySchema = createPropertySchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const listPropertiesQuery = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().max(120).optional(),
  isActive: z.enum(['true', 'false']).optional(),
});

export const idParam = z.object({ id: z.string().min(1) });

export const imageParam = z.object({
  id: z.string().min(1),
  imageId: z.string().min(1),
});
