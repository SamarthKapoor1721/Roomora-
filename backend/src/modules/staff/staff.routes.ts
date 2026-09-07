import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { staffController } from './staff.controller';
import { createStaffSchema, idParam, listStaffQuery, updateStaffSchema } from './staff.schema';

export const ownerStaffRoutes = Router();
ownerStaffRoutes.use(authenticate, authorize('OWNER'));
ownerStaffRoutes.post('/', validate({ body: createStaffSchema }), staffController.create);
ownerStaffRoutes.get('/', validate({ query: listStaffQuery }), staffController.list);
ownerStaffRoutes.get('/:id', validate({ params: idParam }), staffController.get);
ownerStaffRoutes.patch('/:id', validate({ params: idParam, body: updateStaffSchema }), staffController.update);
ownerStaffRoutes.delete('/:id', validate({ params: idParam }), staffController.deactivate);

export const staffSelfRoutes = Router();
staffSelfRoutes.use(authenticate, authorize('STAFF'));
staffSelfRoutes.get('/me', staffController.myProfile);
