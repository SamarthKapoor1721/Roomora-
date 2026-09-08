import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { parseJsonField } from '../../middleware/parseJsonField';
import { makeUploader } from '../../middleware/upload';
import { validate } from '../../middleware/validate';
import { roomsController } from './rooms.controller';
import {
  applicationsToggleSchema,
  browseRoomsQuery,
  createRoomSchema,
  idParam,
  imageParam,
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

const images = makeUploader('room-images');

// Create accepts multipart/form-data: JSON payload in the "data" field plus
// zero or more "images" files. A plain JSON body still works (no "data" field).
roomsRoutes.post(
  '/',
  images.array('images', 10),
  parseJsonField('data'),
  validate({ body: createRoomSchema }),
  roomsController.create,
);
roomsRoutes.get('/', validate({ query: listRoomsQuery }), roomsController.list);
roomsRoutes.get('/:id', validate({ params: idParam }), roomsController.get);
roomsRoutes.patch('/:id', validate({ params: idParam, body: updateRoomSchema }), roomsController.update);
roomsRoutes.post(
  '/:id/applications',
  validate({ params: idParam, body: applicationsToggleSchema }),
  roomsController.toggleApplications,
);
roomsRoutes.delete('/:id', validate({ params: idParam }), roomsController.remove);

// Gallery management for an existing room
roomsRoutes.post(
  '/:id/images',
  validate({ params: idParam }),
  images.array('images', 10),
  roomsController.addImages,
);
roomsRoutes.delete(
  '/:id/images/:imageId',
  validate({ params: imageParam }),
  roomsController.removeImage,
);
