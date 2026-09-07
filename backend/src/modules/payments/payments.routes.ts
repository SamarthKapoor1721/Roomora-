import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { paymentsController } from './payments.controller';
import {
  adjustPaymentSchema,
  generatePeriodSchema,
  idParam,
  leaseIdParam,
  listPaymentsQuery,
  recordPaymentSchema,
  tenantPaySchema,
} from './payments.schema';

export const ownerPaymentRoutes = Router();
ownerPaymentRoutes.use(authenticate, authorize('OWNER'));
ownerPaymentRoutes.get('/', validate({ query: listPaymentsQuery }), paymentsController.listForOwner);
ownerPaymentRoutes.post(
  '/generate',
  validate({ body: generatePeriodSchema }),
  paymentsController.generateCurrentMonth,
);
ownerPaymentRoutes.post(
  '/leases/:leaseId/generate',
  validate({ params: leaseIdParam, body: generatePeriodSchema }),
  paymentsController.generateForLease,
);
ownerPaymentRoutes.post(
  '/:id/record',
  validate({ params: idParam, body: recordPaymentSchema }),
  paymentsController.record,
);
ownerPaymentRoutes.patch(
  '/:id',
  validate({ params: idParam, body: adjustPaymentSchema }),
  paymentsController.adjust,
);

export const tenantPaymentRoutes = Router();
tenantPaymentRoutes.use(authenticate, authorize('TENANT'));
tenantPaymentRoutes.get('/', validate({ query: listPaymentsQuery }), paymentsController.listForTenant);
tenantPaymentRoutes.post(
  '/:id/pay',
  validate({ params: idParam, body: tenantPaySchema }),
  paymentsController.tenantPay,
);
