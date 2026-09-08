import { z } from 'zod';

export const createRoomSchema = z.object({
  propertyId: z.string().min(1),
  name: z.string().min(1).max(120).trim(),
  floor: z.string().max(40).optional(),
  description: z.string().max(2000).optional(),
  monthlyRent: z.number().positive().max(10_000_000),
  securityDeposit: z.number().nonnegative().max(10_000_000).default(0),
  capacity: z.number().int().min(1).max(20).default(1),
  roommatesLimit: z.number().int().min(1).max(20).default(1),
  foodEnabled: z.boolean().default(false),
  foodCharge: z.number().nonnegative().max(1_000_000).default(0),
  amenities: z.array(z.string().max(60)).max(40).default([]),
});

export const updateRoomSchema = createRoomSchema
  .omit({ propertyId: true })
  .partial()
  .extend({
    status: z.enum(['AVAILABLE', 'OCCUPIED', 'FULL', 'INACTIVE']).optional(),
  });

export const applicationsToggleSchema = z.object({
  open: z.boolean(),
});

export const listRoomsQuery = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  propertyId: z.string().optional(),
  status: z.enum(['AVAILABLE', 'OCCUPIED', 'FULL', 'INACTIVE']).optional(),
  applicationsOpen: z.enum(['true', 'false']).optional(),
});

export const browseRoomsQuery = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  city: z.string().max(100).optional(),
  minRent: z.coerce.number().nonnegative().optional(),
  maxRent: z.coerce.number().positive().optional(),
  foodEnabled: z.enum(['true', 'false']).optional(),
});

export const idParam = z.object({ id: z.string().min(1) });

export const imageParam = z.object({
  id: z.string().min(1),
  imageId: z.string().min(1),
});
