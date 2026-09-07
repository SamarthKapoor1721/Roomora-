import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { makeUploader } from '../../middleware/upload';
import { validate } from '../../middleware/validate';
import { maintenanceController } from './maintenance.controller';
import {
  assignSchema,
  createMaintenanceSchema,
  idParam,
  listQuery,
  noteSchema,
  ownerUpdateSchema,
  photoMetaSchema,
  staffStatusSchema,
} from './maintenance.schema';

const photoUpload = makeUploader('maintenance-photos');

// Photos & notes: any of the three roles (service enforces relationship)
export const maintenanceSharedRoutes = Router();
maintenanceSharedRoutes.use(authenticate);
maintenanceSharedRoutes.post(
  '/:id/photos',
  validate({ params: idParam }),
  photoUpload.single('file'),
  validate({ body: photoMetaSchema }),
  maintenanceController.addPhoto,
);
maintenanceSharedRoutes.post(
  '/:id/notes',
  validate({ params: idParam, body: noteSchema }),
  maintenanceController.addNote,
);

export const tenantMaintenanceRoutes = Router();
tenantMaintenanceRoutes.use(authenticate, authorize('TENANT'));
tenantMaintenanceRoutes.post('/', validate({ body: createMaintenanceSchema }), maintenanceController.create);
tenantMaintenanceRoutes.get('/', validate({ query: listQuery }), maintenanceController.listMine);
tenantMaintenanceRoutes.get('/:id', validate({ params: idParam }), maintenanceController.getMine);

export const ownerMaintenanceRoutes = Router();
ownerMaintenanceRoutes.use(authenticate, authorize('OWNER'));
ownerMaintenanceRoutes.get('/', validate({ query: listQuery }), maintenanceController.listForOwner);
ownerMaintenanceRoutes.get('/:id', validate({ params: idParam }), maintenanceController.getForOwner);
ownerMaintenanceRoutes.post('/:id/assign', validate({ params: idParam, body: assignSchema }), maintenanceController.assign);
ownerMaintenanceRoutes.patch('/:id', validate({ params: idParam, body: ownerUpdateSchema }), maintenanceController.ownerUpdate);

export const staffMaintenanceRoutes = Router();
staffMaintenanceRoutes.use(authenticate, authorize('STAFF'));
staffMaintenanceRoutes.get('/', validate({ query: listQuery }), maintenanceController.listForStaff);
staffMaintenanceRoutes.get('/:id', validate({ params: idParam }), maintenanceController.getForStaff);
staffMaintenanceRoutes.patch(
  '/:id/status',
  validate({ params: idParam, body: staffStatusSchema }),
  maintenanceController.staffUpdateStatus,
);
