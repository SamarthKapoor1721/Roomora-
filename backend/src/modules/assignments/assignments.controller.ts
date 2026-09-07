import type { Request, Response } from 'express';
import { audit } from '../../lib/audit';
import { asyncHandler, ok } from '../../lib/http';
import { assignmentsService } from './assignments.service';

export const assignmentsController = {
  listForRoom: asyncHandler(async (req: Request, res: Response) => {
    ok(res, await assignmentsService.listForRoom(req.user!.id, req.params.roomId));
  }),

  manualAssign: asyncHandler(async (req: Request, res: Response) => {
    const result = await assignmentsService.manualAssign(req.user!.id, req.params.roomId, req.body);
    await audit({
      action: 'assignment.manual_create',
      entityType: 'RoomAssignment',
      entityId: result.assignment.id,
      req,
      metadata: { roomId: req.params.roomId, tenantId: req.body.tenantId },
    });
    ok(res, result, 201);
  }),

  endAssignment: asyncHandler(async (req: Request, res: Response) => {
    const result = await assignmentsService.endAssignment(
      req.user!.id,
      req.params.assignmentId,
      req.body?.reason,
    );
    await audit({
      action: 'assignment.end',
      entityType: 'RoomAssignment',
      entityId: req.params.assignmentId,
      req,
    });
    ok(res, result);
  }),

  myRoommates: asyncHandler(async (req: Request, res: Response) => {
    ok(res, await assignmentsService.roommatesForTenant(req.user!.id));
  }),
};
