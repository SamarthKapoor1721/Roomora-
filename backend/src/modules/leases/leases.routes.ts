import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { aiLimiter } from '../../middleware/rateLimit';
import { validate } from '../../middleware/validate';
import { leasesController } from './leases.controller';
import { idParam, listLeasesQuery, updateLeaseSchema } from './leases.schema';

export const ownerLeaseRoutes = Router();
ownerLeaseRoutes.use(authenticate, authorize('OWNER'));
ownerLeaseRoutes.get('/', validate({ query: listLeasesQuery }), leasesController.listForOwner);
ownerLeaseRoutes.get('/:id', validate({ params: idParam }), leasesController.getForOwner);
ownerLeaseRoutes.patch('/:id', validate({ params: idParam, body: updateLeaseSchema }), leasesController.update);
ownerLeaseRoutes.post('/:id/terminate', validate({ params: idParam }), leasesController.terminate);
ownerLeaseRoutes.post('/:id/summarize', aiLimiter, validate({ params: idParam }), leasesController.summarize);

export const tenantLeaseRoutes = Router();
tenantLeaseRoutes.use(authenticate, authorize('TENANT'));
tenantLeaseRoutes.get('/', leasesController.listForTenant);
tenantLeaseRoutes.get('/:id', validate({ params: idParam }), leasesController.getForTenant);
