import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ok, paginated } from '../../lib/http';
import { parsePage } from '../../lib/pagination';
import { prisma } from '../../lib/prisma';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';

const updateMeSchema = z.object({
  fullName: z.string().min(2).max(120).optional(),
  phone: z.string().min(6).max(20).optional(),
});

const auditQuery = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  action: z.string().max(80).optional(),
  entityType: z.string().max(80).optional(),
  entityId: z.string().optional(),
});

export const usersRoutes = Router();
usersRoutes.use(authenticate);

usersRoutes.patch(
  '/me',
  validate({ body: updateMeSchema }),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: req.body,
      select: { id: true, email: true, fullName: true, phone: true, role: true },
    });
    ok(res, user);
  }),
);

// Owner audit log (their own actions + actions on their entities is out of scope;
// this returns actions they performed).
usersRoutes.get(
  '/me/audit-logs',
  authorize('OWNER'),
  validate({ query: auditQuery }),
  asyncHandler(async (req, res) => {
    const { skip, take, page, pageSize } = parsePage(req.query as never);
    const where = {
      actorId: req.user!.id,
      ...(req.query.action ? { action: { contains: String(req.query.action) } } : {}),
      ...(req.query.entityType ? { entityType: String(req.query.entityType) } : {}),
      ...(req.query.entityId ? { entityId: String(req.query.entityId) } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.auditLog.count({ where }),
    ]);
    paginated(res, items, { page, pageSize, total });
  }),
);

// Owner: look up their tenants (for manual assignment / warnings).
usersRoutes.get(
  '/tenants',
  authorize('OWNER'),
  asyncHandler(async (req, res) => {
    const search = String(req.query.search ?? '').trim();
    const tenants = await prisma.user.findMany({
      where: {
        role: 'TENANT',
        isActive: true,
        AND: [
          {
            OR: [
              { tenancies: { some: { room: { property: { ownerId: req.user!.id } } } } },
              { applications: { some: { room: { property: { ownerId: req.user!.id } } } } },
            ],
          },
          ...(search
            ? [
                {
                  OR: [
                    { fullName: { contains: search, mode: 'insensitive' as const } },
                    { email: { contains: search, mode: 'insensitive' as const } },
                  ],
                },
              ]
            : []),
        ],
      },
      select: { id: true, fullName: true, email: true, phone: true },
      take: 50,
    });
    ok(res, tenants);
  }),
);
