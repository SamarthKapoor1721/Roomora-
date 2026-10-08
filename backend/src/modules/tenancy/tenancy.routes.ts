import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler, ok } from '../../lib/http';
import { audit } from '../../lib/audit';
import { tenancyService } from './tenancy.service';

const idParam = z.object({ id: z.string().min(1).max(100) });
export const createTenancyRequest = z.object({ assignmentId: z.string().min(1), type: z.enum(['LEAVE', 'CHANGE']), reason: z.string().trim().min(3).max(2000), targetRoomId: z.string().min(1).optional() }).refine((r) => r.type !== 'CHANGE' || !!r.targetRoomId, { message: 'Choose a target room', path: ['targetRoomId'] });
const reviewSchema = z.object({ decision: z.enum(['APPROVE', 'REJECT']), ownerNote: z.string().trim().max(2000).optional() });

export const tenantTenancyRoutes = Router();
tenantTenancyRoutes.use(authenticate, authorize('TENANT'));
tenantTenancyRoutes.get('/', asyncHandler(async (req, res) => ok(res, await tenancyService.list(req.user!.id))));
tenantTenancyRoutes.get('/options', asyncHandler(async (req, res) => ok(res, await tenancyService.options(req.user!.id))));
tenantTenancyRoutes.post('/', validate({ body: createTenancyRequest }), asyncHandler(async (req, res) => {
  const result = await tenancyService.create(req.user!.id, req.body);
  await audit({ action: 'tenancy.request', entityType: 'TenancyRequest', entityId: result.id, req });
  return ok(res, result, 201);
}));
tenantTenancyRoutes.post('/:id/cancel', validate({ params: idParam }), asyncHandler(async (req, res) => ok(res, await tenancyService.cancel(req.user!.id, req.params.id))));

export const ownerTenancyRoutes = Router();
ownerTenancyRoutes.use(authenticate, authorize('OWNER'));
ownerTenancyRoutes.get('/', asyncHandler(async (req, res) => ok(res, await tenancyService.ownerList(req.user!.id))));
ownerTenancyRoutes.post('/:id/review', validate({ params: idParam, body: reviewSchema }), asyncHandler(async (req, res) => {
  const result = await tenancyService.review(req.user!.id, req.params.id, req.body);
  await audit({ action: 'tenancy.review', entityType: 'TenancyRequest', entityId: req.params.id, req, metadata: { decision: req.body.decision } });
  return ok(res, result);
}));
