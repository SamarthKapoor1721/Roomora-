import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { makeUploader } from '../../middleware/upload';
import { validate } from '../../middleware/validate';
import { cleaningController } from './cleaning.controller';
import {
  assignSchema,
  createCleaningSchema,
  idParam,
  listQuery,
  ownerUpdateSchema,
  photoMetaSchema,
  staffStatusSchema,
} from './cleaning.schema';

const photoUpload = makeUploader('cleaning-photos');

export const ownerCleaningRoutes = Router();
ownerCleaningRoutes.use(authenticate, authorize('OWNER'));
ownerCleaningRoutes.post('/', validate({ body: createCleaningSchema }), cleaningController.create);
ownerCleaningRoutes.get('/', validate({ query: listQuery }), cleaningController.listForOwner);
ownerCleaningRoutes.get('/:id', validate({ params: idParam }), cleaningController.getForOwner);
ownerCleaningRoutes.post('/:id/assign', validate({ params: idParam, body: assignSchema }), cleaningController.assign);
ownerCleaningRoutes.patch('/:id', validate({ params: idParam, body: ownerUpdateSchema }), cleaningController.ownerUpdate);

export const staffCleaningRoutes = Router();
staffCleaningRoutes.use(authenticate, authorize('STAFF'));
staffCleaningRoutes.get('/', validate({ query: listQuery }), cleaningController.listForStaff);
staffCleaningRoutes.get('/:id', validate({ params: idParam }), cleaningController.getForStaff);
staffCleaningRoutes.patch(
  '/:id/status',
  validate({ params: idParam, body: staffStatusSchema }),
  cleaningController.staffUpdateStatus,
);
staffCleaningRoutes.post(
  '/:id/photos',
  validate({ params: idParam }),
  photoUpload.single('file'),
  validate({ body: photoMetaSchema }),
  cleaningController.addPhoto,
);
