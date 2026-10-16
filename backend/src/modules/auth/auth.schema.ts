import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  fullName: z.string().min(2).max(120).trim(),
  phone: z.string().min(6).max(20).optional(),
  // Public self-registration is limited to OWNER and TENANT.
  role: z.enum(['OWNER', 'TENANT']).default('TENANT'),
});

export const loginSchema = z.object({
  email: z.string().trim().min(1).max(254),
  password: z.string().min(1),
});

export const googleSchema = z.object({
  credential: z.string().min(100),
  role: z.enum(['OWNER', 'TENANT']).default('TENANT'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8)
    .max(128)
    .regex(/[a-z]/)
    .regex(/[A-Z]/)
    .regex(/[0-9]/),
});

export const setPasswordSchema = z.object({ password: registerSchema.shape.password });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type GoogleInput = z.infer<typeof googleSchema>;
