import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { makeUploader } from '../../middleware/upload';
import { validate } from '../../middleware/validate';
import { applicationsController } from './applications.controller';
import {
  applySchema,
  decisionSchema,
  docParam,
  idParam,
  listApplicationsQuery,
  updateApplicationSchema,
  uploadDocMetaSchema,
} from './applications.schema';

const docUpload = makeUploader('application-documents');

// ----- Tenant routes -----
export const tenantApplicationRoutes = Router();
tenantApplicationRoutes.use(authenticate, authorize('TENANT'));

tenantApplicationRoutes.post('/', validate({ body: applySchema }), applicationsController.apply);
tenantApplicationRoutes.get('/', validate({ query: listApplicationsQuery }), applicationsController.listMine);
tenantApplicationRoutes.get('/:id', validate({ params: idParam }), applicationsController.getMine);
tenantApplicationRoutes.patch(
  '/:id',
  validate({ params: idParam, body: updateApplicationSchema }),
  applicationsController.updateDraft,
);
tenantApplicationRoutes.post('/:id/withdraw', validate({ params: idParam }), applicationsController.withdraw);
tenantApplicationRoutes.post(
  '/:id/documents',
  validate({ params: idParam }),
  docUpload.single('file'),
  validate({ body: uploadDocMetaSchema }),
  applicationsController.uploadDocument,
);
tenantApplicationRoutes.delete(
  '/:id/documents/:docId',
  validate({ params: docParam }),
  applicationsController.removeDocument,
);
tenantApplicationRoutes.post(
  '/:id/submit',
  validate({ params: idParam }),
  applicationsController.submitForScreening,
);

// ----- Owner routes -----
export const ownerApplicationRoutes = Router();
ownerApplicationRoutes.use(authenticate, authorize('OWNER'));

ownerApplicationRoutes.get('/', validate({ query: listApplicationsQuery }), applicationsController.listForOwner);
ownerApplicationRoutes.get('/:id', validate({ params: idParam }), applicationsController.getForOwner);
ownerApplicationRoutes.post('/:id/rerun-ai', validate({ params: idParam }), applicationsController.rerunAi);
ownerApplicationRoutes.post(
  '/:id/decision',
  validate({ params: idParam, body: decisionSchema }),
  applicationsController.decide,
);
