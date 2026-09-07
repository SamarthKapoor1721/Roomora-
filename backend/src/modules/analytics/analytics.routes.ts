import { Router } from 'express';
import { asyncHandler, ok } from '../../lib/http';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { aiLimiter } from '../../middleware/rateLimit';
import { ownerDashboard, ownerInsights, staffDashboard, tenantDashboard } from './analytics.service';

export const analyticsRoutes = Router();
analyticsRoutes.use(authenticate);

analyticsRoutes.get(
  '/owner/dashboard',
  authorize('OWNER'),
  asyncHandler(async (req, res) => ok(res, await ownerDashboard(req.user!.id))),
);

analyticsRoutes.get(
  '/owner/insights',
  authorize('OWNER'),
  aiLimiter,
  asyncHandler(async (req, res) => ok(res, await ownerInsights(req.user!.id))),
);

analyticsRoutes.get(
  '/tenant/dashboard',
  authorize('TENANT'),
  asyncHandler(async (req, res) => ok(res, await tenantDashboard(req.user!.id))),
);

analyticsRoutes.get(
  '/staff/dashboard',
  authorize('STAFF'),
  asyncHandler(async (req, res) => ok(res, await staffDashboard(req.user!.id))),
);
