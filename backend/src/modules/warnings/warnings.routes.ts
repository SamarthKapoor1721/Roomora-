import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { warningsController } from './warnings.controller';
import {
  createWarningSchema,
  idParam,
  listWarningsQuery,
  updateStatusSchema,
} from './warnings.schema';

export const ownerWarningRoutes = Router();
ownerWarningRoutes.use(authenticate, authorize('OWNER'));
ownerWarningRoutes.get('/', validate({ query: listWarningsQuery }), warningsController.listForOwner);
ownerWarningRoutes.post('/', validate({ body: createWarningSchema }), warningsController.createManual);
ownerWarningRoutes.post('/scan', warningsController.runScan);
ownerWarningRoutes.patch(
  '/:id/status',
  validate({ params: idParam, body: updateStatusSchema }),
  warningsController.updateStatus,
);

export const tenantWarningRoutes = Router();
tenantWarningRoutes.use(authenticate, authorize('TENANT'));
tenantWarningRoutes.get('/', validate({ query: listWarningsQuery }), warningsController.listForTenant);
tenantWarningRoutes.patch(
  '/:id/status',
  validate({ params: idParam, body: updateStatusSchema }),
  warningsController.updateStatus,
);
