import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { assignmentsController } from './assignments.controller';
import {
  assignmentIdParam,
  endAssignmentSchema,
  manualAssignSchema,
  roomIdParam,
} from './assignments.schema';

export const ownerAssignmentRoutes = Router();
ownerAssignmentRoutes.use(authenticate, authorize('OWNER'));

ownerAssignmentRoutes.get(
  '/rooms/:roomId/assignments',
  validate({ params: roomIdParam }),
  assignmentsController.listForRoom,
);
ownerAssignmentRoutes.post(
  '/rooms/:roomId/assignments',
  validate({ params: roomIdParam, body: manualAssignSchema }),
  assignmentsController.manualAssign,
);
ownerAssignmentRoutes.post(
  '/assignments/:assignmentId/end',
  validate({ params: assignmentIdParam, body: endAssignmentSchema }),
  assignmentsController.endAssignment,
);

export const tenantAssignmentRoutes = Router();
tenantAssignmentRoutes.use(authenticate, authorize('TENANT'));
tenantAssignmentRoutes.get('/roommates', assignmentsController.myRoommates);
