import type { Request, Response } from 'express';
import { audit } from '../../lib/audit';
import { asyncHandler, ok, paginated } from '../../lib/http';
import { paymentsService } from './payments.service';

export const paymentsController = {
  generateForLease: asyncHandler(async (req: Request, res: Response) => {
    const { year, month } = req.body;
    const now = new Date();
    const payment = await paymentsService.generateForPeriod(
      req.params.leaseId,
      year ?? now.getUTCFullYear(),
      month ?? now.getUTCMonth() + 1,
    );
    await audit({ action: 'payment.generate', entityType: 'Payment', entityId: payment.id, req });
    ok(res, payment, 201);
  }),

  generateCurrentMonth: asyncHandler(async (req: Request, res: Response) => {
    const result = await paymentsService.generateCurrentMonthForOwner(
      req.user!.id,
      req.body?.year,
      req.body?.month,
    );
    await audit({ action: 'payment.generate_bulk', entityType: 'Payment', req, metadata: result });
    ok(res, result);
  }),

  record: asyncHandler(async (req: Request, res: Response) => {
    const payment = await paymentsService.recordPayment(req.user!.id, req.params.id, req.body);
    await audit({ action: 'payment.record', entityType: 'Payment', entityId: req.params.id, req, metadata: { amount: req.body.amount } });
    ok(res, payment);
  }),

  adjust: asyncHandler(async (req: Request, res: Response) => {
    const payment = await paymentsService.adjust(req.user!.id, req.params.id, req.body);
    await audit({ action: 'payment.adjust', entityType: 'Payment', entityId: req.params.id, req, metadata: req.body });
    ok(res, payment);
  }),

  listForOwner: asyncHandler(async (req: Request, res: Response) => {
    const { items, meta, summary } = await paymentsService.listForOwner(req.user!.id, req.query as never);
    res.json({ data: items, meta: { ...meta, totalPages: Math.max(1, Math.ceil(meta.total / meta.pageSize)) }, summary });
  }),

  listForTenant: asyncHandler(async (req: Request, res: Response) => {
    const { items, meta } = await paymentsService.listForTenant(req.user!.id, req.query as never);
    paginated(res, items, meta);
  }),

  tenantPay: asyncHandler(async (req: Request, res: Response) => {
    const payment = await paymentsService.tenantPay(req.user!.id, req.params.id, req.body);
    await audit({ action: 'payment.tenant_pay', entityType: 'Payment', entityId: req.params.id, req, metadata: { amount: req.body.amount } });
    ok(res, payment);
  }),
};
