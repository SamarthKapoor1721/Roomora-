import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env';
import { audit } from '../../lib/audit';
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors';
import { hashPassword } from '../../lib/auth';
import { asyncHandler, ok } from '../../lib/http';
import { prisma } from '../../lib/prisma';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { registerSchema } from '../auth/auth.schema';

export const adminRoutes = Router();
adminRoutes.use(authenticate, authorize('SUPER_ADMIN'));

const listSchema = z.object({
  q: z.string().trim().max(100).optional(),
  role: z.enum(['OWNER', 'TENANT', 'STAFF', 'SUPER_ADMIN']).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

adminRoutes.get('/overview', asyncHandler(async (_req, res) => {
  let aiOnline = false;
  try {
    const response = await fetch(`${env.ai.serviceUrl.replace(/\/$/, '')}/health`, { signal: AbortSignal.timeout(2500) });
    aiOnline = response.ok;
  } catch { /* AI service may be offline; report it in the portal. */ }
  const [users, owners, tenants, staff, active, properties, rooms, applications, recent] = await Promise.all([
    prisma.user.count(), prisma.user.count({ where: { role: 'OWNER' } }),
    prisma.user.count({ where: { role: 'TENANT' } }), prisma.user.count({ where: { role: 'STAFF' } }),
    prisma.user.count({ where: { isActive: true } }), prisma.property.count(), prisma.room.count(),
    prisma.application.count(),
    prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 12, select: { id: true, action: true, entityType: true, entityId: true, createdAt: true, actor: { select: { fullName: true, email: true } } } }),
  ]);
  ok(res, { counts: { users, owners, tenants, staff, active, properties, rooms, applications }, integrations: { google: !!env.googleClientId, ai: aiOnline }, recent });
}));

adminRoutes.get('/users', validate({ query: listSchema }), asyncHandler(async (req, res) => {
  const { q, role, page } = req.query as unknown as z.infer<typeof listSchema>;
  const where = {
    ...(role ? { role } : {}),
    ...(q ? { OR: [{ fullName: { contains: q, mode: 'insensitive' as const } }, { email: { contains: q, mode: 'insensitive' as const } }] } : {}),
  };
  const pageSize = 20;
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' }, select: {
      id: true, email: true, fullName: true, phone: true, role: true, isActive: true, createdAt: true, googleId: true,
      _count: { select: { properties: true, applications: true, ownedStaff: true } },
    } }),
  ]);
  ok(res, { users: users.map(({ googleId, ...user }) => ({ ...user, signInMethod: googleId ? 'Google' : 'Password' })), total, page, pageSize });
}));

const createUserSchema = registerSchema.extend({ role: z.enum(['OWNER', 'TENANT']) });
adminRoutes.post('/users', validate({ body: createUserSchema }), asyncHandler(async (req, res) => {
  const input = req.body as z.infer<typeof createUserSchema>;
  if (await prisma.user.findUnique({ where: { email: input.email } })) throw conflict('An account with this email already exists');
  const created = await prisma.user.create({ data: {
    email: input.email, fullName: input.fullName, phone: input.phone,
    passwordHash: await hashPassword(input.password), role: input.role,
  }, select: { id: true, email: true, fullName: true, phone: true, role: true, isActive: true } });
  await audit({ action: 'admin.user.create', entityType: 'User', entityId: created.id, metadata: { email: created.email, role: created.role }, req });
  ok(res, created, 201);
}));

const editUserSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().email().toLowerCase().trim(),
  phone: z.union([z.string().min(6).max(20), z.literal('')]).optional(),
  role: z.enum(['OWNER', 'TENANT', 'STAFF']),
});

function businessRecords(counts: Record<string, number>) {
  return Object.entries(counts).filter(([relation, count]) => !['refreshTokens', 'notifications', 'auditLogs'].includes(relation) && count > 0);
}

adminRoutes.patch('/users/:id', validate({ body: editUserSchema }), asyncHandler(async (req, res) => {
  const target = await prisma.user.findUnique({ where: { id: req.params.id }, include: { _count: true } });
  if (!target) throw notFound('User not found');
  if (target.role === 'SUPER_ADMIN' || target.id === req.user!.id) throw forbidden('Super admin accounts cannot be edited here');
  const input = req.body as z.infer<typeof editUserSchema>;
  if (input.email !== target.email) {
    if (target.googleId) throw conflict('Google-linked account email cannot be changed');
    if (await prisma.user.findUnique({ where: { email: input.email } })) throw conflict('An account with this email already exists');
  }
  if (input.role !== target.role && (target.role === 'STAFF' || businessRecords(target._count).length)) {
    throw conflict('Role cannot be changed while the account has staff or rental records');
  }
  const updated = await prisma.user.update({ where: { id: target.id }, data: {
    fullName: input.fullName, email: input.email, phone: input.phone || null, role: input.role,
  }, select: { id: true, email: true, fullName: true, phone: true, role: true, isActive: true } });
  if (input.email !== target.email || input.role !== target.role) {
    await prisma.refreshToken.updateMany({ where: { userId: target.id, OR: [{ revokedAt: null }, { revokedAt: { isSet: false } }] }, data: { revokedAt: new Date() } });
  }
  await audit({ action: 'admin.user.update', entityType: 'User', entityId: target.id, metadata: { email: updated.email, role: updated.role }, req });
  ok(res, updated);
}));

const deleteUserSchema = z.object({ confirmEmail: z.string().email().toLowerCase().trim() });
adminRoutes.delete('/users/:id', validate({ body: deleteUserSchema }), asyncHandler(async (req, res) => {
  if (req.params.id === req.user!.id) throw forbidden('You cannot delete your own account');
  const target = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: req.params.id }, include: { _count: true } });
    if (!user) throw notFound('User not found');
    if (user.role === 'SUPER_ADMIN') throw forbidden('Super admin accounts cannot be deleted here');
    if (req.body.confirmEmail !== user.email) throw badRequest('Enter the user email to confirm deletion');
    const linked = businessRecords(user._count);
    if (linked.length) throw conflict('This account has property, tenancy, task, or other business records. Deactivate it instead.', linked.map(([relation, count]) => ({ relation, count })));
    await tx.user.delete({ where: { id: user.id } });
    return user;
  });
  await audit({ action: 'admin.user.delete', entityType: 'User', entityId: target.id, metadata: { email: target.email, role: target.role }, req });
  ok(res, { deleted: true });
}));

const statusSchema = z.object({ isActive: z.boolean() });
adminRoutes.patch('/users/:id/status', validate({ body: statusSchema }), asyncHandler(async (req, res) => {
  if (req.params.id === req.user!.id) throw badRequest('You cannot change your own account status');
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) throw notFound('User not found');
  if (target.role === 'SUPER_ADMIN') throw forbidden('Super admin accounts cannot be changed here');
  const updated = await prisma.user.update({ where: { id: target.id }, data: { isActive: req.body.isActive }, select: { id: true, isActive: true } });
  if (!updated.isActive) await prisma.refreshToken.updateMany({ where: { userId: target.id, OR: [{ revokedAt: null }, { revokedAt: { isSet: false } }] }, data: { revokedAt: new Date() } });
  await audit({ action: updated.isActive ? 'admin.user.activate' : 'admin.user.deactivate', entityType: 'User', entityId: target.id, metadata: { email: target.email }, req });
  ok(res, updated);
}));
