import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { parseJsonField } from '../../middleware/parseJsonField';
import { makeUploader } from '../../middleware/upload';
import { validate } from '../../middleware/validate';
import { propertiesController } from './properties.controller';
import {
  createPropertySchema,
  idParam,
  imageParam,
  listPropertiesQuery,
  updatePropertySchema,
} from './properties.schema';

export const propertiesRoutes = Router();

propertiesRoutes.use(authenticate, authorize('OWNER'));

const images = makeUploader('property-images');

// Create accepts multipart/form-data: JSON payload in the "data" field plus
// zero or more "images" files. A plain JSON body still works (no "data" field).
propertiesRoutes.post(
  '/',
  images.array('images', 10),
  parseJsonField('data'),
  validate({ body: createPropertySchema }),
  propertiesController.create,
);
propertiesRoutes.get('/', validate({ query: listPropertiesQuery }), propertiesController.list);
propertiesRoutes.get('/:id', validate({ params: idParam }), propertiesController.get);
propertiesRoutes.patch(
  '/:id',
  validate({ params: idParam, body: updatePropertySchema }),
  propertiesController.update,
);
propertiesRoutes.delete('/:id', validate({ params: idParam }), propertiesController.remove);

// Gallery management for an existing property
propertiesRoutes.post(
  '/:id/images',
  validate({ params: idParam }),
  images.array('images', 10),
  propertiesController.addImages,
);
propertiesRoutes.delete(
  '/:id/images/:imageId',
  validate({ params: imageParam }),
  propertiesController.removeImage,
);
