import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { propertiesController } from './properties.controller';
import {
  createPropertySchema,
  idParam,
  listPropertiesQuery,
  updatePropertySchema,
} from './properties.schema';

export const propertiesRoutes = Router();

propertiesRoutes.use(authenticate, authorize('OWNER'));

propertiesRoutes.post('/', validate({ body: createPropertySchema }), propertiesController.create);
propertiesRoutes.get('/', validate({ query: listPropertiesQuery }), propertiesController.list);
propertiesRoutes.get('/:id', validate({ params: idParam }), propertiesController.get);
propertiesRoutes.patch(
  '/:id',
  validate({ params: idParam, body: updatePropertySchema }),
  propertiesController.update,
);
propertiesRoutes.delete('/:id', validate({ params: idParam }), propertiesController.remove);
