import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ok, paginated } from '../../lib/http';
import { parsePage } from '../../lib/pagination';
import { prisma } from '../../lib/prisma';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';

const listQuery = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  unread: z.enum(['true', 'false']).optional(),
});
const idParam = z.object({ id: z.string().min(1) });

export const notificationsRoutes = Router();
notificationsRoutes.use(authenticate);

notificationsRoutes.get(
  '/',
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const { skip, take, page, pageSize } = parsePage(req.query as never);
    const where = {
      userId: req.user!.id,
      ...(req.query.unread === 'true' ? { readAt: null } : {}),
    };
    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: req.user!.id, readAt: null } }),
    ]);
    res.json({
      data: items,
      meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)), unreadCount },
    });
  }),
);

notificationsRoutes.post(
  '/:id/read',
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: { readAt: new Date() },
    });
    ok(res, { success: true });
  }),
);

notificationsRoutes.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, readAt: null },
      data: { readAt: new Date() },
    });
    ok(res, { success: true });
  }),
);
