import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { roomsController } from './rooms.controller';
import {
  applicationsToggleSchema,
  browseRoomsQuery,
  createRoomSchema,
  idParam,
  listRoomsQuery,
  updateRoomSchema,
} from './rooms.schema';

// Tenant/browse routes (auth required, any logged-in user may browse open rooms)
export const browseRoutes = Router();
browseRoutes.use(authenticate);
browseRoutes.get('/', validate({ query: browseRoomsQuery }), roomsController.browse);
browseRoutes.get('/:id', validate({ params: idParam }), roomsController.browseOne);

// Owner room management
export const roomsRoutes = Router();
roomsRoutes.use(authenticate, authorize('OWNER'));
roomsRoutes.post('/', validate({ body: createRoomSchema }), roomsController.create);
roomsRoutes.get('/', validate({ query: listRoomsQuery }), roomsController.list);
roomsRoutes.get('/:id', validate({ params: idParam }), roomsController.get);
roomsRoutes.patch('/:id', validate({ params: idParam, body: updateRoomSchema }), roomsController.update);
roomsRoutes.post(
  '/:id/applications',
  validate({ params: idParam, body: applicationsToggleSchema }),
  roomsController.toggleApplications,
);
roomsRoutes.delete('/:id', validate({ params: idParam }), roomsController.remove);
